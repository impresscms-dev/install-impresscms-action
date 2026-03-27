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
}
