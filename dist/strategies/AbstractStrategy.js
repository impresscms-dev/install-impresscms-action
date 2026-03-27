import AbstractMethodNotImplementedError from "../Errors/AbstractMethodNotImplementedError.js"

export default class AbstractStrategy {
  constructor(context) {
    this.context = context
    this.name = this.constructor.name
  }

  async isSupported() {
    throw new AbstractMethodNotImplementedError(this.name, "isSupported")
  }

  async apply() {
    throw new AbstractMethodNotImplementedError(this.name, "apply")
  }
}
