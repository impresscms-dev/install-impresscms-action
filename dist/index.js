import {existsSync} from "node:fs"
import path from "node:path"
import process from "node:process"
import {spawn} from "node:child_process"
import * as core from "@actions/core"
import InputDto from "./DTO/InputDto.js"
import ResultsDto from "./DTO/ResultsDto.js"
import TngStrategy from "./strategies/TngStrategy.js"
import DefaultStrategy from "./strategies/DefaultStrategy.js"
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
  const projectPath = path.resolve(inputDto.getPath())
  if (!existsSync(projectPath)) {
    throw new PathNotFoundError(projectPath)
  }

  const context = {
    projectPath,
    runCommand
  }

  const strategies = [
    new TngStrategy(context),
    new DefaultStrategy(context)
  ]

  for (const strategy of strategies) {
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
