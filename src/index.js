import {existsSync} from "node:fs"
import path from "node:path"
import process from "node:process"
import {spawn} from "node:child_process"
import * as core from "@actions/core"
import ResultsDto from "./DTO/ResultsDto.js"
import TngStrategy from "./strategies/TngStrategy.js"
import LegacyStrategy from "./strategies/LegacyStrategy.js"

const getInput = (name, fallback = "") => process.env[`INPUT_${name.toUpperCase()}`] ?? fallback

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
      reject(new Error(`Command failed: ${command} ${args.join(" ")}\n${stderr}`))
      return
    }
    resolve({stdout, stderr})
  })
})

const run = async () => {
  const projectPath = path.resolve(getInput("path", "."))
  if (!existsSync(projectPath)) {
    throw new Error(`Path does not exist: ${projectPath}`)
  }

  const context = {
    projectPath,
    getInput,
    runCommand
  }

  const strategies = [
    new TngStrategy(context),
    new LegacyStrategy(context)
  ]

  for (const strategy of strategies) {
    const supported = await strategy.isSupported()
    if (!supported) {
      continue
    }

    const result = await strategy.apply()
    if (!(result instanceof ResultsDto)) {
      throw new Error(`Strategy ${strategy.name} must return ResultsDto`)
    }

    result.applyOutputs(core.setOutput)
    return
  }

  throw new Error("No supported strategy was found for this ImpressCMS checkout")
}

run().catch(error => {
  process.stderr.write(`${error.message}\n`)
  process.exitCode = 1
})
