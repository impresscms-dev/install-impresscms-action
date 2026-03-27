import {spawn} from "node:child_process"
import * as core from "@actions/core"
import CommandFailedError from "../Errors/CommandFailedError.js"

export default class CommandRunnerService {
  /**
   * Execute a command and stream output to action logs.
   *
   * @param {string} command Executable name.
   * @param {string[]} args Executable arguments.
   * @param {import("node:child_process").SpawnOptions} options Spawn options.
   * @returns {Promise<{stdout: string, stderr: string}>}
   */
  async run(command, args, options = {}) {
    return await new Promise((resolve, reject) => {
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
  }
}
