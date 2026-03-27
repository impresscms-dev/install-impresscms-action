export default class RedirectLocationMissingError extends Error {
  constructor(pathname) {
    super(`Redirect without location from ${pathname}`)
    this.name = "RedirectLocationMissingError"
  }
}
