export default class CommandFailedError extends Error {
  constructor(command, args, stderr) {
    super(`Command failed: ${command} ${args.join(" ")}\n${stderr}`)
    this.name = "CommandFailedError"
  }
}
