import {existsSync, mkdirSync, readFileSync} from "node:fs"
import path from "node:path"
import {randomBytes} from "node:crypto"
import {request as playwrightRequest} from "playwright"
import AbstractStrategy from "./AbstractStrategy.js"
import ResultsDto from "../DTO/ResultsDto.js"
import RedirectLocationMissingError from "../Errors/RedirectLocationMissingError.js"
import InstallerRequestFailedError from "../Errors/InstallerRequestFailedError.js"
import ImpressVersionNotDetectedError from "../Errors/ImpressVersionNotDetectedError.js"
import ImpressVersionRequirementsMissingError from "../Errors/ImpressVersionRequirementsMissingError.js"
import NetworkService from "../Services/NetworkService.js"
import FilePermissionService from "../Services/FilePermissionService.js"
import ApacheContainerInstance from "../Infrastructure/ApacheContainerInstance.js"
import RequirementsInfo from "../Config/RequirementsInfo.js"

/**
 * @param {string} value
 * @returns {string}
 */
const normalizePath = value => value.replaceAll("\\", "/")

export default class DefaultStrategy extends AbstractStrategy {
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
      appKey: inputDto.getAppKey(),
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
      FilePermissionService.chmodRecursive(candidate)
    }
  }

  /**
   * @param {{projectPath: string, htdocsPath: string, trustPath: string, containerRootPath: string, containerTrustPath: string}} paths
   * @returns {Promise<ApacheContainerInstance>}
   */
  async startApacheContainer(paths) {
    const impressVersion = this.detectImpressVersion(paths.projectPath)
    const phpRequirements = RequirementsInfo[impressVersion]
    if (!phpRequirements) {
      throw new ImpressVersionRequirementsMissingError(impressVersion)
    }

    return await ApacheContainerInstance.start({
      phpVersion: phpRequirements.max,
      htdocsPath: paths.htdocsPath,
      trustPath: paths.trustPath,
      containerRootPath: paths.containerRootPath,
      containerTrustPath: paths.containerTrustPath
    })
  }

  /**
   * @param {string} projectPath
   * @returns {string}
   */
  detectImpressVersion(projectPath) {
    const versionFileCandidates = [
      path.join(projectPath, "htdocs", "include", "version.php"),
      path.join(projectPath, "include", "version.php")
    ]

    for (const filePath of versionFileCandidates) {
      if (!existsSync(filePath)) {
        continue
      }

      const contents = readFileSync(filePath, {encoding: "utf8"})
      const fullVersionMatch = contents.match(/ImpressCMS\s+(\d+\.\d+(?:\.\d+)?)/i)
      if (fullVersionMatch) {
        const [, version] = fullVersionMatch
        const [, major, minor] = version.match(/(\d+)\.(\d+)/) ?? []
        if (major && minor) {
          return `${major}.${minor}`
        }
      }
    }

    throw new ImpressVersionNotDetectedError()
  }

  /**
   * @param {string} baseUrl
   * @param {{projectPath: string, htdocsPath: string, trustPath: string}} paths
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @returns {Promise<void>}
   */
  async runInstaller(baseUrl, paths, inputDto) {
    await NetworkService.waitForServer(`${baseUrl}/install/index.php`)
    const client = await this.#createInstallerClient(baseUrl)

    try {
      await client.send("/install/page_langselect.php", {method: "POST", formData: {lang: inputDto.getLanguage()}})
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
      URL: inputDto.getUrl(),
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
      DB_TYPE: inputDto.getDatabaseType(),
      DB_HOST: inputDto.getDatabaseHost(),
      DB_USER: inputDto.getDatabaseUser(),
      DB_PASS: inputDto.getDatabasePassword(),
      DB_PCONNECT: "0"
    }
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @returns {Record<string, string>}
   */
  createDbSettingsFormData(inputDto) {
    return {
      DB_NAME: inputDto.getDatabaseName(),
      DB_CHARSET: inputDto.getDatabaseCharset(),
      DB_COLLATION: inputDto.getDatabaseCollation(),
      DB_PREFIX: inputDto.getDatabasePrefix(),
      DB_SALT: randomBytes(16).toString("hex")
    }
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @returns {Record<string, string>}
   */
  createSiteInitFormData(inputDto) {
    return {
      adminname: inputDto.getAdminName(),
      adminlogin_name: inputDto.getAdminLogin(),
      adminmail: inputDto.getAdminEmail(),
      adminpass: inputDto.getAdminPass(),
      adminpass2: inputDto.getAdminPass()
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
