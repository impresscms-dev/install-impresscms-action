export default class CommandFailedError extends Error {
  /**
   * @param {string} command
   * @param {string[]} args
   * @param {string} stderr
   */
  constructor(command, args, stderr) {
    super(`Command failed: ${command} ${args.join(" ")}\n${stderr}`)
    this.name = "CommandFailedError"
  }
}
