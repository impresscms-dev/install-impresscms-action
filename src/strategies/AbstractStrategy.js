import AbstractMethodNotImplementedError from "../Errors/AbstractMethodNotImplementedError.js"

export default class AbstractStrategy {
  /**
   * @param {object} context
   */
  constructor(context) {
    this.context = context
    this.name = this.constructor.name
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @returns {Promise<boolean>}
   */
  async isSupported(inputDto) {
    void inputDto
    throw new AbstractMethodNotImplementedError(this.name, "isSupported")
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @returns {Promise<import("../DTO/ResultsDto.js").default>}
   */
  async apply(inputDto) {
    void inputDto
    throw new AbstractMethodNotImplementedError(this.name, "apply")
  }
}
