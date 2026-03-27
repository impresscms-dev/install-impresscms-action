import {existsSync} from "node:fs"
import path from "node:path"
import {spawn} from "node:child_process"
import {fileURLToPath} from "node:url"
import * as core from "@actions/core"
import {ContainerBuilder, JsFileLoader} from "node-dependency-injection"
import InputDto from "./DTO/InputDto.js"
import ResultsDto from "./DTO/ResultsDto.js"
import CommandFailedError from "./Errors/CommandFailedError.js"
import PathNotFoundError from "./Errors/PathNotFoundError.js"
import StrategyResultTypeError from "./Errors/StrategyResultTypeError.js"
import NoSupportedStrategyError from "./Errors/NoSupportedStrategyError.js"

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = path.dirname(currentFilePath)

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
    const message = chunk.trim()
    if (message) {
      core.info(message)
    }
  })

  child.stderr.on("data", data => {
    const chunk = data.toString()
    stderr += chunk
    const message = chunk.trim()
    if (message) {
      core.error(message)
    }
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
  const inputDto = InputDto.fromActionInput(core.getInput)
  const projectPath = path.resolve(inputDto.path)
  if (!existsSync(projectPath)) {
    throw new PathNotFoundError(projectPath)
  }

  const context = {
    projectPath,
    runCommand
  }

  const container = new ContainerBuilder()
  const loader = new JsFileLoader(container)
  await loader.load(path.join(currentDirPath, "Config", "Container.js"))
  container.set("app.context", context)

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
  core.setFailed(error.message)
})
