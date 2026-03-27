import ApacheContainerInstance from "../Infrastructure/ApacheContainerInstance.js"

export default class ApacheContainerFactory {
  /**
   * @param {object} params
   * @param {string} params.phpVersion
   * @param {string} params.htdocsPath
   * @param {string} params.trustPath
   * @param {string} params.containerRootPath
   * @param {string} params.containerTrustPath
   * @param {{host: string, ipAddress: string}[]} [params.extraHosts]
   * @returns {ApacheContainerInstance}
   */
  build({
    phpVersion,
    htdocsPath,
    trustPath,
    containerRootPath,
    containerTrustPath,
    extraHosts = []
  }) {
    return new ApacheContainerInstance({
      phpVersion,
      htdocsPath,
      trustPath,
      containerRootPath,
      containerTrustPath,
      extraHosts
    })
  }
}
