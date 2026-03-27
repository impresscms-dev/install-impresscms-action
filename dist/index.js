import {existsSync} from "node:fs"
import path from "node:path"
import process from "node:process"
import {spawn} from "node:child_process"
import * as core from "@actions/core"
import {ContainerBuilder, Reference} from "node-dependency-injection"
import InputDto from "./DTO/InputDto.js"
import ResultsDto from "./DTO/ResultsDto.js"
import TngStrategy from "./strategies/TngStrategy.js"
import DefaultStrategy from "./strategies/DefaultStrategy.js"
import FilePermissionService from "./Services/FilePermissionService.js"
import NetworkService from "./Services/NetworkService.js"
import ImpressVersionService from "./Services/ImpressVersionService.js"
import ApacheContainerFactory from "./Factories/ApacheContainerFactory.js"
import CommandFailedError from "./Errors/CommandFailedError.js"
import PathNotFoundError from "./Errors/PathNotFoundError.js"
import StrategyResultTypeError from "./Errors/StrategyResultTypeError.js"
import NoSupportedStrategyError from "./Errors/NoSupportedStrategyError.js"

/**
 * Read action input by name.
 *
 * @param {string} name Input name without `INPUT_` prefix.
 * @param {string} fallback Value used when input is not set.
 * @returns {string}
 */
const getInput = (name, fallback = "") => process.env[`INPUT_${name.toUpperCase()}`] ?? fallback

/**
 * Execute a command and stream output to action logs.
 *
 * @param {string} command Executable name.
 * @param {string[]} args Executable arguments.
 * @param {import("node:child_process").SpawnOptions} options Spawn options.
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
const runCommand = async (command, args, options = {}) => await new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  })

  let stdout = ""
  let stderr = ""

  child.stdout.on("data", data => {
    const chunk = data.toString()
    stdout += chunk
    process.stdout.write(chunk)
  })

  child.stderr.on("data", data => {
    const chunk = data.toString()
    stderr += chunk
    process.stderr.write(chunk)
  })

  child.on("error", reject)
  child.on("close", code => {
    if (code !== 0) {
      reject(new CommandFailedError(command, args, stderr))
      return
    }
    resolve({stdout, stderr})
  })
})

const run = async () => {
  const inputDto = InputDto.fromActionInput(getInput)
  const projectPath = path.resolve(inputDto.path)
  if (!existsSync(projectPath)) {
    throw new PathNotFoundError(projectPath)
  }

  const context = {
    projectPath,
    runCommand
  }

  const container = new ContainerBuilder()
  container.register("service.file_permission", FilePermissionService)
  container.register("service.network", NetworkService)
  container.register("service.impress_version", ImpressVersionService)
  container.register("factory.apache_container", ApacheContainerFactory)

  container.register("strategy.tng", TngStrategy, [
    context,
    new Reference("service.file_permission")
  ]).addTag("strategy")

  container.register("strategy.default", DefaultStrategy, [
    context,
    new Reference("service.network"),
    new Reference("service.file_permission"),
    new Reference("service.impress_version"),
    new Reference("factory.apache_container")
  ]).addTag("strategy")

  for (const taggedService of container.findTaggedServiceIds("strategy")) {
    const strategy = container.get(taggedService.id)
    const supported = await strategy.isSupported(inputDto)
    if (!supported) {
      continue
    }

    const result = await strategy.apply(inputDto)
    if (!(result instanceof ResultsDto)) {
      throw new StrategyResultTypeError(strategy.name)
    }

    result.applyOutputs(core.setOutput)
    return
  }

  throw new NoSupportedStrategyError()
}

run().catch(error => {
  process.stderr.write(`${error.message}\n`)
  process.exitCode = 1
})
