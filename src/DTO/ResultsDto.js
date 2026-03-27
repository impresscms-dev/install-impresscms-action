export default class ResultsDto {
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
    this.appKey = appKey
    this.usesComposer = usesComposer
    this.usesPhoenix = usesPhoenix
  }

  /**
   * Write action outputs.
   *
   * @param {(name: string, value: string | boolean) => void} setOutput
   */
  applyOutputs(setOutput) {
    setOutput("app_key", this.appKey)
    setOutput("uses_composer", this.usesComposer)
    setOutput("uses_phoenix", this.usesPhoenix)
  }
}
