import AbstractMethodNotImplementedError from "../Errors/AbstractMethodNotImplementedError.js"

export default class AbstractStrategy {
  /**
   * @returns {void}
   */
  constructor() {
    this.name = this.constructor.name
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @param {string} projectPath
   * @returns {Promise<boolean>}
   */
  async isSupported(inputDto, projectPath) {
    void inputDto
    void projectPath
    throw new AbstractMethodNotImplementedError(this.name, "isSupported")
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @param {string} projectPath
   * @returns {Promise<import("../DTO/ResultsDto.js").default>}
   */
  async apply(inputDto, projectPath) {
    void inputDto
    void projectPath
    throw new AbstractMethodNotImplementedError(this.name, "apply")
  }
}
