export default class ResultsDto {
  #data

  /**
   * @param {object} [params]
   * @param {string} [params.appKey]
   * @param {boolean} [params.usesComposer]
   * @param {boolean} [params.usesPhoenix]
   */
  constructor({
    appKey = "",
    usesComposer = false,
    usesPhoenix = false
  } = {}) {
    this.#data = {
      appKey,
      usesComposer,
      usesPhoenix
    }
  }

  /**
   * @returns {string}
   */
  getAppKey() {
    return this.#data.appKey
  }

  /**
   * @returns {boolean}
   */
  getUsesComposer() {
    return this.#data.usesComposer
  }

  /**
   * @returns {boolean}
   */
  getUsesPhoenix() {
    return this.#data.usesPhoenix
  }

  /**
   * Write action outputs.
   *
   * @param {(name: string, value: string | boolean) => void} setOutput
   */
  applyOutputs(setOutput) {
    setOutput("app_key", this.getAppKey())
    setOutput("uses_composer", this.getUsesComposer())
    setOutput("uses_phoenix", this.getUsesPhoenix())
  }
}
