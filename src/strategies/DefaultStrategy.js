import {existsSync, mkdirSync} from "node:fs"
import path from "node:path"
import process from "node:process"
import {randomBytes} from "node:crypto"
import {spawn} from "node:child_process"
import {CookieJar} from "tough-cookie"
import makeFetchCookie from "fetch-cookie"
import AbstractStrategy from "./AbstractStrategy.js"
import ResultsDto from "../DTO/ResultsDto.js"
import RedirectLocationMissingError from "../Errors/RedirectLocationMissingError.js"
import InstallerRequestFailedError from "../Errors/InstallerRequestFailedError.js"
import NetworkService from "../Services/NetworkService.js"

const normalizePath = value => value.replaceAll("\\", "/")

const createInstallerClient = baseUrl => {
  const cookieJar = new CookieJar()
  const fetchWithCookies = makeFetchCookie(fetch, cookieJar)

  const send = async (pathname, {method = "GET", formData = null, followRedirect = true} = {}) => {
    const headers = {}

    let body = undefined
    if (formData) {
      headers["Content-Type"] = "application/x-www-form-urlencoded"
      body = new URLSearchParams(formData).toString()
    }

    const response = await fetchWithCookies(`${baseUrl}${pathname}`, {
      method,
      headers,
      body,
      redirect: "manual"
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location) {
        throw new RedirectLocationMissingError(pathname)
      }
      if (!followRedirect) {
        return response
      }
      const redirectUrl = new URL(location, `${baseUrl}${pathname}`)
      return await send(redirectUrl.pathname + redirectUrl.search, {method: "GET"})
    }

    if (response.status >= 400) {
      const bodyText = await response.text()
      throw new InstallerRequestFailedError(pathname, response.status, bodyText)
    }

    return response
  }

  return {send}
}

export default class DefaultStrategy extends AbstractStrategy {
  async isSupported(inputDto) {
    void inputDto
    const {projectPath} = this.context
    const hasLegacyInstaller = existsSync(path.join(projectPath, "htdocs", "install", "page_langselect.php"))
    const hasLegacyMainFile = existsSync(path.join(projectPath, "htdocs", "mainfile.php"))
    const hasComposer = existsSync(path.join(projectPath, "composer.json"))
    return hasLegacyInstaller && hasLegacyMainFile && !hasComposer
  }

  async apply(inputDto) {
    const paths = this.resolveLegacyPaths()
    this.ensureTrustPath(paths.trustPath)
    await this.applyLegacyPermissions(paths)
    const {baseUrl, phpServer} = await this.startPhpServer(paths.htdocsPath)

    try {
      await this.runInstaller(baseUrl, paths, inputDto)
    } finally {
      phpServer.kill("SIGTERM")
    }

    return new ResultsDto({
      appKey: inputDto.appKey,
      usesComposer: false,
      usesPhoenix: false
    })
  }

  resolveLegacyPaths() {
    const {projectPath} = this.context
    return {
      projectPath,
      htdocsPath: path.join(projectPath, "htdocs"),
      trustPath: path.join(projectPath, "trust_path")
    }
  }

  ensureTrustPath(trustPath) {
    mkdirSync(trustPath, {recursive: true})
  }

  async applyLegacyPermissions(paths) {
    const {projectPath, runCommand} = this.context
    const chmodCandidates = [
      path.join(paths.htdocsPath, "cache"),
      path.join(paths.htdocsPath, "modules"),
      path.join(paths.htdocsPath, "templates_c"),
      path.join(paths.htdocsPath, "uploads"),
      paths.trustPath
    ]

    for (const candidate of chmodCandidates) {
      if (!existsSync(candidate)) {
        continue
      }
      try {
        await runCommand("chmod", ["-R", "0777", candidate], {cwd: projectPath, env: process.env})
      } catch {
        // Keep going, installer also does best-effort chmod internally.
      }
    }
  }

  async startPhpServer(htdocsPath) {
    const port = await NetworkService.getFreePort()
    const baseUrl = `http://127.0.0.1:${port}`
    const phpServer = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", htdocsPath], {
      cwd: htdocsPath,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    })
    phpServer.stdout.on("data", data => process.stdout.write(data.toString()))
    phpServer.stderr.on("data", data => process.stderr.write(data.toString()))

    return {baseUrl, phpServer}
  }

  async runInstaller(baseUrl, paths, inputDto) {
    await NetworkService.waitForServer(`${baseUrl}/install/index.php`)
    const client = createInstallerClient(baseUrl)

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
  }

  createPathSettingsFormData(paths, inputDto) {
    return {
      URL: inputDto.url,
      ROOT_PATH: normalizePath(paths.htdocsPath),
      TRUST_PATH: normalizePath(paths.trustPath)
    }
  }

  createDbConnectionFormData(inputDto) {
    return {
      DB_TYPE: inputDto.databaseType,
      DB_HOST: inputDto.databaseHost,
      DB_USER: inputDto.databaseUser,
      DB_PASS: inputDto.databasePassword,
      DB_PCONNECT: "0"
    }
  }

  createDbSettingsFormData(inputDto) {
    return {
      DB_NAME: inputDto.databaseName,
      DB_CHARSET: inputDto.databaseCharset,
      DB_COLLATION: inputDto.databaseCollation,
      DB_PREFIX: inputDto.databasePrefix,
      DB_SALT: randomBytes(16).toString("hex")
    }
  }

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
