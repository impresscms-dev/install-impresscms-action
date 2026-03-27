export default class ImpressVersionNotDetectedError extends Error {
  constructor() {
    super("Unable to detect ImpressCMS version from checked out files")
    this.name = "ImpressVersionNotDetectedError"
  }
}
