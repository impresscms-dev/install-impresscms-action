import {existsSync, mkdirSync} from "node:fs"
import path from "node:path"
import {randomBytes} from "node:crypto"
import {request as playwrightRequest} from "playwright"
import AbstractStrategy from "./AbstractStrategy.js"
import ResultsDto from "../DTO/ResultsDto.js"
import RedirectLocationMissingError from "../Errors/RedirectLocationMissingError.js"
import InstallerRequestFailedError from "../Errors/InstallerRequestFailedError.js"
import ImpressVersionRequirementsMissingError from "../Errors/ImpressVersionRequirementsMissingError.js"
import RequirementsInfo from "../Config/RequirementsInfo.js"

/**
 * @param {string} value
 * @returns {string}
 */
const normalizePath = value => value.replaceAll("\\", "/")

export default class DefaultStrategy extends AbstractStrategy {
  /**
   * @param {object} context
   * @param {import("../Services/NetworkService.js").default} networkService
   * @param {import("../Services/FilePermissionService.js").default} filePermissionService
   * @param {import("../Services/ImpressVersionService.js").default} impressVersionService
   * @param {import("../Factories/ApacheContainerFactory.js").default} apacheContainerFactory
   */
  constructor(context, networkService, filePermissionService, impressVersionService, apacheContainerFactory) {
    super(context)
    this.networkService = networkService
    this.filePermissionService = filePermissionService
    this.impressVersionService = impressVersionService
    this.apacheContainerFactory = apacheContainerFactory
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @returns {Promise<boolean>}
   */
  async isSupported(inputDto) {
    void inputDto
    const {projectPath} = this.context
    const hasLegacyInstaller = existsSync(path.join(projectPath, "htdocs", "install", "page_langselect.php"))
    const hasLegacyMainFile = existsSync(path.join(projectPath, "htdocs", "mainfile.php"))
    const hasComposer = existsSync(path.join(projectPath, "composer.json"))
    return hasLegacyInstaller && hasLegacyMainFile && !hasComposer
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @returns {Promise<ResultsDto>}
   */
  async apply(inputDto) {
    const paths = this.resolveLegacyPaths()
    this.ensureTrustPath(paths.trustPath)
    await this.applyLegacyPermissions(paths)
    const apacheServer = await this.startApacheContainer(paths)

    try {
      await this.runInstaller(apacheServer.baseUrl, paths, inputDto)
    } finally {
      await apacheServer.stop()
    }

    return new ResultsDto({
      appKey: inputDto.appKey,
      usesComposer: false,
      usesPhoenix: false
    })
  }

  /**
   * @returns {{projectPath: string, htdocsPath: string, trustPath: string}}
   */
  resolveLegacyPaths() {
    const {projectPath} = this.context
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
   * @returns {Promise<import("../Infrastructure/ApacheContainerInstance.js").default>}
   */
  async startApacheContainer(paths) {
    const impressVersion = this.impressVersionService.detect(paths.projectPath)
    const phpRequirements = RequirementsInfo[impressVersion]
    if (!phpRequirements) {
      throw new ImpressVersionRequirementsMissingError(impressVersion)
    }

    const apacheContainer = this.apacheContainerFactory.build({
      phpVersion: phpRequirements.max,
      htdocsPath: paths.htdocsPath,
      trustPath: paths.trustPath,
      containerRootPath: paths.containerRootPath,
      containerTrustPath: paths.containerTrustPath
    })

    await apacheContainer.start()

    return apacheContainer
  }

  /**
   * @param {string} baseUrl
   * @param {{projectPath: string, htdocsPath: string, trustPath: string}} paths
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @returns {Promise<void>}
   */
  async runInstaller(baseUrl, paths, inputDto) {
    await this.networkService.waitForServer(`${baseUrl}/install/index.php`)
    const client = await this.#createInstallerClient(baseUrl)

    try {
      await client.send("/install/page_langselect.php", {method: "POST", formData: {lang: inputDto.language}})
      await client.send("/install/page_start.php")
      await client.send("/install/page_modcheck.php")
      await client.send("/install/page_pathsettings.php", {method: "POST", formData: this.createPathSettingsFormData(paths, inputDto)})
      await client.send("/install/page_dbconnection.php", {method: "POST", formData: this.createDbConnectionFormData(inputDto)})
      await client.send("/install/page_dbsettings.php", {method: "POST", formData: this.createDbSettingsFormData(inputDto)})
      await client.send("/install/page_configsave.php", {method: "POST", formData: {}})
      await client.send("/install/page_tablescreate.php", {method: "POST", formData: {}})
      await client.send("/install/page_siteinit.php", {method: "POST", formData: this.createSiteInitFormData(inputDto)})
      await client.send("/install/page_tablesfill.php", {method: "POST", formData: {}})
      await client.send("/install/page_modulesinstall.php", {method: "POST", formData: {mod: "0"}})
      await client.send("/install/page_end.php")
    } finally {
      await client.dispose()
    }
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
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @returns {Record<string, string>}
   */
  createDbConnectionFormData(inputDto) {
    return {
      DB_TYPE: inputDto.databaseType,
      DB_HOST: inputDto.databaseHost,
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

  /**
   * @param {string} baseUrl
   * @returns {Promise<{send: (pathname: string, options?: {method?: string, formData?: Record<string, string>, followRedirect?: boolean}) => Promise<import("playwright").APIResponse>, dispose: () => Promise<void>}>}
   */
  async #createInstallerClient(baseUrl) {
    const requestContext = await playwrightRequest.newContext({
      baseURL: baseUrl
    })

    /**
     * @param {string} pathname
     * @param {{method?: string, formData?: Record<string, string>, followRedirect?: boolean}} options
     * @returns {Promise<import("playwright").APIResponse>}
     */
    const send = async (pathname, {method = "GET", formData = null, followRedirect = true} = {}) => {
      const response = await requestContext.fetch(pathname, {
        method,
        form: formData ?? undefined,
        maxRedirects: 0
      })

      const status = response.status()
      if (status >= 300 && status < 400) {
        const location = response.headers().location
        if (!location) {
          throw new RedirectLocationMissingError(pathname)
        }
        if (!followRedirect) {
          return response
        }
        const redirectUrl = new URL(location, `${baseUrl}${pathname}`)
        return await send(redirectUrl.pathname + redirectUrl.search, {method: "GET"})
      }

      if (status >= 400) {
        const bodyText = await response.text()
        throw new InstallerRequestFailedError(pathname, status, bodyText)
      }

      return response
    }

    const dispose = async () => {
      await requestContext.dispose()
    }

    return {send, dispose}
  }
}
