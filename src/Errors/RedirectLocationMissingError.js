export default class RedirectLocationMissingError extends Error {
  /**
   * @param {string} pathname
   */
  constructor(pathname) {
    super(`Redirect without location from ${pathname}`)
    this.name = "RedirectLocationMissingError"
  }
}
