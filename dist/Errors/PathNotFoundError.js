export default class PathNotFoundError extends Error {
  /**
   * @param {string} projectPath
   */
  constructor(projectPath) {
    super(`Path does not exist: ${projectPath}`)
    this.name = "PathNotFoundError"
  }
}
