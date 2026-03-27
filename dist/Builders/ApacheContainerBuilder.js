import {GenericContainer} from "testcontainers"
import ApacheContainerInstance from "../Infrastructure/ApacheContainerInstance.js"

export default class ApacheContainerBuilder {
  /**
   * @param {object} params
   * @param {string} params.phpVersion
   * @param {string} params.htdocsPath
   * @param {string} params.trustPath
   * @param {string} params.containerRootPath
   * @param {string} params.containerTrustPath
   * @returns {Promise<ApacheContainerInstance>}
   */
  async build({
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
