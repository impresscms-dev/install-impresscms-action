import AbstractMethodNotImplementedError from "../Errors/AbstractMethodNotImplementedError.js"

export default class AbstractStrategy {
  constructor(context) {
    this.context = context
    this.name = this.constructor.name
  }

  async isSupported(inputDto) {
    void inputDto
    throw new AbstractMethodNotImplementedError(this.name, "isSupported")
  }

  async apply(inputDto) {
    void inputDto
    throw new AbstractMethodNotImplementedError(this.name, "apply")
  }
}
