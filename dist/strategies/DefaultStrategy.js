import {existsSync, mkdirSync} from "node:fs"
import net from "node:net"
import path from "node:path"
import process from "node:process"
import {randomBytes} from "node:crypto"
import {spawn} from "node:child_process"
import {CookieJar} from "tough-cookie"
import makeFetchCookie from "fetch-cookie"
import AbstractStrategy from "./AbstractStrategy.js"
import ResultsDto from "../DTO/ResultsDto.js"
import PhpServerNotReadyError from "../Errors/PhpServerNotReadyError.js"
import RedirectLocationMissingError from "../Errors/RedirectLocationMissingError.js"
import InstallerRequestFailedError from "../Errors/InstallerRequestFailedError.js"

const normalizePath = value => value.replaceAll("\\", "/")

const getFreePort = async () => await new Promise((resolve, reject) => {
  const server = net.createServer()
  server.listen(0, "127.0.0.1", () => {
    const address = server.address()
    const port = typeof address === "object" && address ? address.port : 0
    server.close(() => resolve(port))
  })
  server.on("error", reject)
})

const waitForServer = async (url, retries = 50, waitMs = 150) => {
  for (let i = 0; i < retries; i += 1) {
    try {
      const response = await fetch(url, {redirect: "manual"})
      if (response.status >= 200 && response.status < 500) {
        return
      }
    } catch {
      // retry
    }
    await new Promise(resolve => setTimeout(resolve, waitMs))
  }
  throw new PhpServerNotReadyError()
}

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
  async isSupported() {
    const {projectPath} = this.context
    const hasLegacyInstaller = existsSync(path.join(projectPath, "htdocs", "install", "page_langselect.php"))
    const hasLegacyMainFile = existsSync(path.join(projectPath, "htdocs", "mainfile.php"))
    const hasComposer = existsSync(path.join(projectPath, "composer.json"))
    return hasLegacyInstaller && hasLegacyMainFile && !hasComposer
  }

  async apply() {
    const {projectPath, getInput, runCommand} = this.context
    const htdocsPath = path.join(projectPath, "htdocs")
    const trustPath = path.join(projectPath, "trust_path")

    mkdirSync(trustPath, {recursive: true})

    const chmodCandidates = [
      path.join(htdocsPath, "cache"),
      path.join(htdocsPath, "modules"),
      path.join(htdocsPath, "templates_c"),
      path.join(htdocsPath, "uploads"),
      trustPath
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

    const port = await getFreePort()
    const baseUrl = `http://127.0.0.1:${port}`
    const phpServer = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", htdocsPath], {
      cwd: htdocsPath,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    })
    phpServer.stdout.on("data", data => process.stdout.write(data.toString()))
    phpServer.stderr.on("data", data => process.stderr.write(data.toString()))

    try {
      await waitForServer(`${baseUrl}/install/index.php`)
      const client = createInstallerClient(baseUrl)

      await client.send("/install/page_langselect.php", {
        method: "POST",
        formData: {
          lang: getInput("language", "english")
        }
      })
      await client.send("/install/page_start.php")
      await client.send("/install/page_modcheck.php")

      await client.send("/install/page_pathsettings.php", {
        method: "POST",
        formData: {
          URL: getInput("url", baseUrl),
          ROOT_PATH: normalizePath(htdocsPath),
          TRUST_PATH: normalizePath(trustPath)
        }
      })

      await client.send("/install/page_dbconnection.php", {
        method: "POST",
        formData: {
          DB_TYPE: getInput("database_type", "pdo.mysql"),
          DB_HOST: getInput("database_host", "127.0.0.1"),
          DB_USER: getInput("database_user", ""),
          DB_PASS: getInput("database_password", ""),
          DB_PCONNECT: "0"
        }
      })

      await client.send("/install/page_dbsettings.php", {
        method: "POST",
        formData: {
          DB_NAME: getInput("database_name", "icms"),
          DB_CHARSET: getInput("database_charset", "utf8"),
          DB_COLLATION: getInput("database_collation", "utf8_general_ci"),
          DB_PREFIX: getInput("database_prefix", "icms"),
          DB_SALT: randomBytes(16).toString("hex")
        }
      })

      await client.send("/install/page_configsave.php", {
        method: "POST",
        formData: {}
      })
      await client.send("/install/page_tablescreate.php", {
        method: "POST",
        formData: {}
      })
      await client.send("/install/page_siteinit.php", {
        method: "POST",
        formData: {
          adminname: getInput("admin_name", "icms"),
          adminlogin_name: getInput("admin_login", "icms"),
          adminmail: getInput("admin_email", "noreply@impresscms.dev"),
          adminpass: getInput("admin_pass", "icms"),
          adminpass2: getInput("admin_pass", "icms")
        }
      })
      await client.send("/install/page_tablesfill.php", {
        method: "POST",
        formData: {}
      })
      await client.send("/install/page_modulesinstall.php", {
        method: "POST",
        formData: {
          mod: "0"
        }
      })
      await client.send("/install/page_end.php")
    } finally {
      phpServer.kill("SIGTERM")
    }

    return new ResultsDto({
      appKey: getInput("app_key", ""),
      usesComposer: false,
      usesPhoenix: false
    })
  }
}
