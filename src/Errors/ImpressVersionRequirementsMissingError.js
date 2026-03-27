export default class ImpressVersionRequirementsMissingError extends Error {
  /**
   * @param {string} version
   */
  constructor(version) {
    super(`No PHP requirements mapping found for ImpressCMS version ${version}`)
    this.name = "ImpressVersionRequirementsMissingError"
  }
}
