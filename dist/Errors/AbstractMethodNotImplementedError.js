export default class AbstractMethodNotImplementedError extends Error {
  constructor(className, methodName) {
    super(`${className}.${methodName}() must be implemented`)
    this.name = "AbstractMethodNotImplementedError"
  }
}
