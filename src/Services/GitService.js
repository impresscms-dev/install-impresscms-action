import process from "node:process"

export default class GitService {
  /**
   * @param {{run: (command: string, args: string[], options?: import("node:child_process").SpawnOptions) => Promise<{stdout: string, stderr: string}>}} commandRunnerService
   * @param {string} repositoryUrl
   */
  constructor(commandRunnerService, repositoryUrl) {
    this.commandRunnerService = commandRunnerService
    this.repositoryUrl = repositoryUrl
  }

  /**
   * @param {string} targetPath
   * @param {string} ref
   * @returns {Promise<void>}
   */
  async checkoutImpresscmsReference(targetPath, ref) {
    await this.commandRunnerService.run("git", ["clone", "--depth", "1", "--branch", ref, this.repositoryUrl, targetPath], {
      cwd: process.cwd(),
      env: process.env
    })
  }
}
