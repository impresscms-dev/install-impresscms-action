export default class InstallerRequestFailedError extends Error {
  /**
   * @param {string} pathname
   * @param {number} status
   * @param {string} bodyText
   */
  constructor(pathname, status, bodyText) {
    super(`Installer request failed (${pathname}): HTTP ${status}\n${bodyText}`)
    this.name = "InstallerRequestFailedError"
  }
}
