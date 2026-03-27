export default class AbstractMethodNotImplementedError extends Error {
  /**
   * @param {string} className
   * @param {string} methodName
   */
  constructor(className, methodName) {
    super(`${className}.${methodName}() must be implemented`)
    this.name = "AbstractMethodNotImplementedError"
  }
}
