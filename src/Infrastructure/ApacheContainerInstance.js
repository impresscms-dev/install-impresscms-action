import {GenericContainer} from "testcontainers"

export default class ApacheContainerInstance {
  #container
  #baseUrl

  /**
   * @param {import("testcontainers").StartedTestContainer} container
   */
  constructor(container) {
    this.#container = container
    this.#baseUrl = `http://${container.getHost()}:${container.getMappedPort(80)}`
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
  async stop() {
    await this.#container.stop()
  }

  /**
   * @param {object} params
   * @param {string} params.phpVersion
   * @param {string} params.htdocsPath
   * @param {string} params.trustPath
   * @param {string} params.containerRootPath
   * @param {string} params.containerTrustPath
   * @returns {Promise<ApacheContainerInstance>}
   */
  static async start({
    phpVersion,
    htdocsPath,
    trustPath,
    containerRootPath,
    containerTrustPath
  }) {
    const container = await new GenericContainer(`php:${phpVersion}-apache`)
      .withExposedPorts(80)
      .withBindMounts([
        {source: htdocsPath, target: containerRootPath},
        {source: trustPath, target: containerTrustPath}
      ])
      .withStartupTimeout(120000)
      .start()

    return new ApacheContainerInstance(container)
  }
}
