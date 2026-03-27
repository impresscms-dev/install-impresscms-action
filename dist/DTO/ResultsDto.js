export default class ResultsDto {
  constructor({
    appKey = "",
    usesComposer = false,
    usesPhoenix = false
  } = {}) {
    this.appKey = appKey
    this.usesComposer = usesComposer
    this.usesPhoenix = usesPhoenix
  }

  applyOutputs(setOutput) {
    setOutput("app_key", this.appKey)
    setOutput("uses_composer", this.usesComposer)
    setOutput("uses_phoenix", this.usesPhoenix)
  }
}
