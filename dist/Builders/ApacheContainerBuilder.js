import ApacheContainerInstance from "../Infrastructure/ApacheContainerInstance.js"

export default class ApacheContainerBuilder {
  /**
   * @param {object} params
   * @param {string} params.phpVersion
   * @param {string} params.htdocsPath
   * @param {string} params.trustPath
   * @param {string} params.containerRootPath
   * @param {string} params.containerTrustPath
   * @returns {ApacheContainerInstance}
   */
  build({
    phpVersion,
    htdocsPath,
    trustPath,
    containerRootPath,
    containerTrustPath
  }) {
    return new ApacheContainerInstance({
      phpVersion,
      htdocsPath,
      trustPath,
      containerRootPath,
      containerTrustPath
    })
  }
}
