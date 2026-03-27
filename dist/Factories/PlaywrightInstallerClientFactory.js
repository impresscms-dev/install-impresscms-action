import PlaywrightInstallerClientInstance from "../Infrastructure/PlaywrightInstallerClientInstance.js"

export default class PlaywrightInstallerClientFactory {
  /**
   * @param {string} baseUrl
   * @returns {PlaywrightInstallerClientInstance}
   */
  build(baseUrl) {
    return new PlaywrightInstallerClientInstance(baseUrl)
  }
}
