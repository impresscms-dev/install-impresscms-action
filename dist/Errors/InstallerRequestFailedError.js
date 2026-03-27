export default class InstallerRequestFailedError extends Error {
  constructor(pathname, status, bodyText) {
    super(`Installer request failed (${pathname}): HTTP ${status}\n${bodyText}`)
    this.name = "InstallerRequestFailedError"
  }
}
