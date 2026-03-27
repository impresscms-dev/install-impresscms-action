import {GenericContainer} from "testcontainers"

export default class ApacheContainerInstance {
  #config
  #container
  #baseUrl

  /**
   * @param {object} config
   * @param {string} config.phpVersion
   * @param {string} config.htdocsPath
   * @param {string} config.trustPath
   * @param {string} config.containerRootPath
   * @param {string} config.containerTrustPath
   */
  constructor(config) {
    this.#config = config
    this.#container = null
    this.#baseUrl = ""
  }

  /**
   * @returns {string}
   */
  get baseUrl() {
    return this.#baseUrl
  }

  /**
   * @returns {Promise<void>}
   */
  async start() {
    if (this.#container) {
      return
    }

    const container = await new GenericContainer(`php:${this.#config.phpVersion}-apache`)
      .withExposedPorts(80)
      .withBindMounts([
        {source: this.#config.htdocsPath, target: this.#config.containerRootPath},
        {source: this.#config.trustPath, target: this.#config.containerTrustPath}
      ])
      .withExtraHosts([
        {
          host: "host.docker.internal",
          ipAddress: "host-gateway"
        }
      ])
      .withStartupTimeout(120000)
      .start()

    this.#container = container
    this.#baseUrl = `http://${container.getHost()}:${container.getMappedPort(80)}`
  }

  /**
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.#container) {
      return
    }
    await this.#container.stop()
    this.#container = null
    this.#baseUrl = ""
  }
}
