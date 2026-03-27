export default class PathNotFoundError extends Error {
  constructor(projectPath) {
    super(`Path does not exist: ${projectPath}`)
    this.name = "PathNotFoundError"
  }
}
