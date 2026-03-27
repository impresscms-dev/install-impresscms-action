import {existsSync, mkdirSync} from "node:fs"
import path from "node:path"
import {randomBytes} from "node:crypto"
import {lookup as dnsLookup} from "node:dns/promises"
import AbstractStrategy from "./AbstractStrategy.js"
import ResultsDto from "../DTO/ResultsDto.js"
import ImpressVersionRequirementsMissingError from "../Errors/ImpressVersionRequirementsMissingError.js"
import RequirementsInfo from "../Config/RequirementsInfo.js"

/**
 * @param {string} value
 * @returns {string}
 */
const normalizePath = value => value.replaceAll("\\", "/")
const installerLocalHosts = new Set(["localhost", "127.0.0.1", "::1"])
const installerHostAlias = "host.docker.internal"
const hostGatewayAddress = "host-gateway"

export default class DefaultStrategy extends AbstractStrategy {
  /**
   * @param {import("../Services/NetworkService.js").default} networkService
   * @param {import("../Services/FilePermissionService.js").default} filePermissionService
   * @param {import("../Services/ImpressVersionService.js").default} impressVersionService
   * @param {import("../Factories/ApacheContainerFactory.js").default} apacheContainerFactory
   * @param {import("../Factories/PlaywrightInstallerClientFactory.js").default} playwrightInstallerClientFactory
   * @param {import("../Services/PlaywrightArtifactsService.js").default} playwrightArtifactsService
   */
  constructor(networkService, filePermissionService, impressVersionService, apacheContainerFactory, playwrightInstallerClientFactory, playwrightArtifactsService) {
    super()
    this.networkService = networkService
    this.filePermissionService = filePermissionService
    this.impressVersionService = impressVersionService
    this.apacheContainerFactory = apacheContainerFactory
    this.playwrightInstallerClientFactory = playwrightInstallerClientFactory
    this.playwrightArtifactsService = playwrightArtifactsService
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @param {string} projectPath
   * @returns {Promise<boolean>}
   */
  async isSupported(inputDto, projectPath) {
    void inputDto
    const hasLegacyInstaller = existsSync(path.join(projectPath, "htdocs", "install", "page_langselect.php"))
    const hasLegacyMainFile = existsSync(path.join(projectPath, "htdocs", "mainfile.php"))
    const hasComposer = existsSync(path.join(projectPath, "composer.json"))
    return hasLegacyInstaller && hasLegacyMainFile && !hasComposer
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @param {string} projectPath
   * @returns {Promise<ResultsDto>}
   */
  async apply(inputDto, projectPath) {
    const detectedImpresscmsVersion = this.impressVersionService.detect(projectPath)
    const requirementsVersion = this.impressVersionService.toMajorMinor(detectedImpresscmsVersion)
    const installerDatabaseTarget = await this.resolveInstallerDatabaseTarget(inputDto.databaseHost)
    const paths = this.resolveLegacyPaths(projectPath)
    this.ensureTrustPath(paths.trustPath)
    await this.applyLegacyPermissions(paths)
    const apacheServer = await this.startApacheContainer(paths, requirementsVersion, installerDatabaseTarget.extraHosts)

    try {
      await this.runInstaller(apacheServer.baseUrl, paths, inputDto, installerDatabaseTarget.host)
    } finally {
      await apacheServer.stop()
    }

    return new ResultsDto({
      appKey: inputDto.appKey,
      detectedImpresscmsVersion,
      usesComposer: false,
      usesPhoenix: false
    })
  }

  /**
   * @param {string} projectPath
   * @returns {{projectPath: string, htdocsPath: string, trustPath: string, containerRootPath: string, containerTrustPath: string}}
   */
  resolveLegacyPaths(projectPath) {
    return {
      projectPath,
      htdocsPath: path.join(projectPath, "htdocs"),
      trustPath: path.join(projectPath, "trust_path"),
      containerRootPath: "/var/www/html",
      containerTrustPath: "/var/www/trust_path"
    }
  }

  /**
   * @param {string} trustPath
   * @returns {void}
   */
  ensureTrustPath(trustPath) {
    mkdirSync(trustPath, {recursive: true})
  }

  /**
   * @param {{projectPath: string, htdocsPath: string, trustPath: string}} paths
   * @returns {Promise<void>}
   */
  async applyLegacyPermissions(paths) {
    const chmodCandidates = [
      path.join(paths.htdocsPath, "cache"),
      path.join(paths.htdocsPath, "modules"),
      path.join(paths.htdocsPath, "templates_c"),
      path.join(paths.htdocsPath, "uploads"),
      paths.trustPath
    ]

    for (const candidate of chmodCandidates) {
      this.filePermissionService.chmodRecursive(candidate)
    }
  }

  /**
   * @param {{projectPath: string, htdocsPath: string, trustPath: string, containerRootPath: string, containerTrustPath: string}} paths
   * @param {string} detectedImpresscmsVersion
   * @param {{host: string, ipAddress: string}[]} extraHosts
   * @returns {Promise<import("../Infrastructure/ApacheContainerInstance.js").default>}
   */
  async startApacheContainer(paths, detectedImpresscmsVersion, extraHosts = []) {
    const phpRequirements = RequirementsInfo[detectedImpresscmsVersion]
    if (!phpRequirements) {
      throw new ImpressVersionRequirementsMissingError(detectedImpresscmsVersion)
    }

    const apacheContainer = this.apacheContainerFactory.build({
      phpVersion: phpRequirements.max,
      htdocsPath: paths.htdocsPath,
      trustPath: paths.trustPath,
      containerRootPath: paths.containerRootPath,
      containerTrustPath: paths.containerTrustPath,
      extraHosts
    })

    await apacheContainer.start()

    return apacheContainer
  }

  /**
   * @param {string} baseUrl
   * @param {{projectPath: string, htdocsPath: string, trustPath: string}} paths
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @param {string} installerDatabaseHost
   * @returns {Promise<void>}
   */
  async runInstaller(baseUrl, paths, inputDto, installerDatabaseHost = inputDto.databaseHost) {
    await this.networkService.waitForServer(`${baseUrl}/install/index.php`)
    const client = this.playwrightInstallerClientFactory.build(baseUrl)
    await client.start()

    try {
      await client.send("/install/page_langselect.php", {method: "POST", formData: {lang: inputDto.language}})
      await client.send("/install/page_start.php")
      await client.send("/install/page_modcheck.php")
      await client.send("/install/page_pathsettings.php", {method: "POST", formData: this.createPathSettingsFormData(paths, inputDto)})
      if (this.hasDbConnectionStep(paths)) {
        await client.send("/install/page_dbconnection.php", {method: "POST", formData: this.createDbConnectionFormData(inputDto, installerDatabaseHost)})
        await client.send("/install/page_dbsettings.php", {method: "POST", formData: this.createDbSettingsFormData(inputDto)})
      } else {
        await client.send("/install/page_dbsettings.php", {method: "POST", formData: this.createLegacyDbSettingsFormData(inputDto, installerDatabaseHost)})
      }
      await client.send("/install/page_configsave.php", {method: "POST", formData: {}})
      await client.send("/install/page_tablescreate.php", {method: "POST", formData: {}})
      await client.send("/install/page_siteinit.php", {method: "POST", formData: this.createSiteInitFormData(inputDto)})
      await client.send("/install/page_tablesfill.php", {method: "POST", formData: {}})
      await client.send("/install/page_modulesinstall.php", {method: "POST", formData: {mod: "0"}})
      await client.send("/install/page_end.php")
    } catch (error) {
      await this.playwrightArtifactsService.uploadFailureArtifacts(client)
      throw error
    } finally {
      await client.stop()
    }
  }

  /**
   * @param {{htdocsPath: string}} paths
   * @returns {boolean}
   */
  hasDbConnectionStep(paths) {
    return existsSync(path.join(paths.htdocsPath, "install", "page_dbconnection.php"))
  }

  /**
   * @param {{projectPath: string, htdocsPath: string, trustPath: string}} paths
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @returns {Record<string, string>}
   */
  createPathSettingsFormData(paths, inputDto) {
    return {
      URL: inputDto.url,
      ROOT_PATH: normalizePath(paths.containerRootPath),
      TRUST_PATH: normalizePath(paths.containerTrustPath)
    }
  }

  /**
   * @param {string} databaseHost
   * @returns {Promise<{host: string, extraHosts: {host: string, ipAddress: string}[]}>}
   */
  async resolveInstallerDatabaseTarget(databaseHost) {
    if (installerLocalHosts.has(databaseHost)) {
      return {host: installerHostAlias, extraHosts: []}
    }

    if (this.isIpLoopback(databaseHost)) {
      return {host: installerHostAlias, extraHosts: []}
    }

    if (await this.resolvesToLoopback(databaseHost)) {
      return {
        host: databaseHost,
        extraHosts: [
          {
            host: databaseHost,
            ipAddress: hostGatewayAddress
          }
        ]
      }
    }

    return {host: databaseHost, extraHosts: []}
  }

  /**
   * @param {string} host
   * @returns {Promise<boolean>}
   */
  async resolvesToLoopback(host) {
    try {
      const addresses = await dnsLookup(host, {all: true})
      return addresses.some(addressInfo => this.isIpLoopback(addressInfo.address))
    } catch {
      return false
    }
  }

  /**
   * @param {string} address
   * @returns {boolean}
   */
  isIpLoopback(address) {
    return address.startsWith("127.") || address === "::1" || address === "0:0:0:0:0:0:0:1"
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @param {string} installerDatabaseHost
   * @returns {Record<string, string>}
   */
  createDbConnectionFormData(inputDto, installerDatabaseHost = inputDto.databaseHost) {
    return {
      DB_TYPE: inputDto.databaseType,
      DB_HOST: installerDatabaseHost,
      DB_PORT: inputDto.databasePort,
      DB_USER: inputDto.databaseUser,
      DB_PASS: inputDto.databasePassword,
      DB_PCONNECT: "0"
    }
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @returns {Record<string, string>}
   */
  createDbSettingsFormData(inputDto) {
    return {
      DB_NAME: inputDto.databaseName,
      DB_CHARSET: inputDto.databaseCharset,
      DB_COLLATION: inputDto.databaseCollation,
      DB_PREFIX: inputDto.databasePrefix,
      DB_SALT: randomBytes(16).toString("hex")
    }
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @param {string} installerDatabaseHost
   * @returns {Record<string, string>}
   */
  createLegacyDbSettingsFormData(inputDto, installerDatabaseHost) {
    return {
      DB_TYPE: this.resolveLegacyDatabaseType(inputDto.databaseType),
      DB_HOST: this.resolveLegacyDatabaseHost(installerDatabaseHost, inputDto.databasePort),
      DB_USER: inputDto.databaseUser,
      DB_PASS: inputDto.databasePassword,
      DB_NAME: inputDto.databaseName,
      DB_PREFIX: inputDto.databasePrefix,
      DB_PCONNECT: "0"
    }
  }

  /**
   * @param {string} databaseType
   * @returns {string}
   */
  resolveLegacyDatabaseType(databaseType) {
    if (databaseType.startsWith("pdo.")) {
      return databaseType.slice(4)
    }

    return databaseType
  }

  /**
   * @param {string} databaseHost
   * @param {string} databasePort
   * @returns {string}
   */
  resolveLegacyDatabaseHost(databaseHost, databasePort) {
    if (!databasePort || databasePort === "3306") {
      return databaseHost
    }

    if (databaseHost.includes(":")) {
      return databaseHost
    }

    return `${databaseHost}:${databasePort}`
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @returns {Record<string, string>}
   */
  createSiteInitFormData(inputDto) {
    return {
      adminname: inputDto.adminName,
      adminlogin_name: inputDto.adminLogin,
      adminmail: inputDto.adminEmail,
      adminpass: inputDto.adminPass,
      adminpass2: inputDto.adminPass
    }
  }

}
