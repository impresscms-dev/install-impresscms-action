export default class PhpServerNotReadyError extends Error {
  constructor() {
    super("PHP built-in server did not become ready in time")
    this.name = "PhpServerNotReadyError"
  }
}
