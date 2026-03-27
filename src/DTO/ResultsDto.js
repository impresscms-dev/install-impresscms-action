export default class ResultsDto {
  #data

  /**
   * @param {object} [params]
   * @param {string} [params.appKey]
   * @param {string} [params.detectedImpresscmsVersion]
   * @param {boolean} [params.usesComposer]
   * @param {boolean} [params.usesPhoenix]
   */
  constructor({
    appKey = "",
    detectedImpresscmsVersion = "",
    usesComposer = false,
    usesPhoenix = false
  } = {}) {
    this.#data = {
      appKey,
      detectedImpresscmsVersion,
      usesComposer,
      usesPhoenix
    }
  }

  /**
   * @returns {string}
   */
  get appKey() {
    return this.#data.appKey
  }

  /**
   * @returns {string}
   */
  get detectedImpresscmsVersion() {
    return this.#data.detectedImpresscmsVersion
  }

  /**
   * @returns {boolean}
   */
  get usesComposer() {
    return this.#data.usesComposer
  }

  /**
   * @returns {boolean}
   */
  get usesPhoenix() {
    return this.#data.usesPhoenix
  }

  /**
   * Write action outputs.
   *
   * @param {(name: string, value: string | boolean) => void} setOutput
   */
  applyOutputs(setOutput) {
    setOutput("app_key", this.appKey)
    setOutput("detected_impresscms_version", this.detectedImpresscmsVersion)
    setOutput("uses_composer", this.usesComposer)
    setOutput("uses_phoenix", this.usesPhoenix)
  }
}
