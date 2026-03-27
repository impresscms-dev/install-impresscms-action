import * as core from "@actions/core"

export default class ActionsCoreService {
  /**
   * @param {string} name
   * @returns {string}
   */
  getInput(name) {
    return core.getInput(name)
  }

  /**
   * @param {string} name
   * @param {string | boolean} value
   * @returns {void}
   */
  setOutput(name, value) {
    core.setOutput(name, value)
  }

  /**
   * @param {string} message
   * @returns {void}
   */
  setFailed(message) {
    core.setFailed(message)
  }

  /**
   * @param {string} message
   * @returns {void}
   */
  info(message) {
    core.info(message)
  }

  /**
   * @param {string} message
   * @returns {void}
   */
  error(message) {
    core.error(message)
  }
}
