import {mkdir, writeFile} from "node:fs/promises"
import path from "node:path"
import {chromium, request as playwrightRequest} from "playwright"
import RedirectLocationMissingError from "../Errors/RedirectLocationMissingError.js"
import InstallerRequestFailedError from "../Errors/InstallerRequestFailedError.js"

export default class PlaywrightInstallerClientInstance {
  #baseUrl
  #lastPathname
  #requestLog
  #requestContext

  /**
   * @param {string} baseUrl
   */
  constructor(baseUrl) {
    this.#baseUrl = baseUrl
    this.#lastPathname = "/install/index.php"
    this.#requestLog = []
    this.#requestContext = null
  }

  /**
   * @returns {Promise<void>}
   */
  async start() {
    if (this.#requestContext) {
      return
    }

    this.#requestContext = await playwrightRequest.newContext({
      baseURL: this.#baseUrl
    })
  }

  /**
   * @param {string} pathname
   * @param {{method?: string, formData?: Record<string, string>, followRedirect?: boolean}} options
   * @returns {Promise<import("playwright").APIResponse>}
   */
  async send(pathname, {method = "GET", formData = null, followRedirect = true} = {}) {
    if (!this.#requestContext) {
      await this.start()
    }
    this.#lastPathname = pathname

    const response = await this.#requestContext.fetch(pathname, {
      method,
      form: formData ?? undefined,
      maxRedirects: 0
    })

    const status = response.status()
    this.#requestLog.push({method, pathname, status})
    if (status >= 300 && status < 400) {
      const location = response.headers().location
      if (!location) {
        throw new RedirectLocationMissingError(pathname)
      }
      if (!followRedirect) {
        return response
      }
      const redirectUrl = new URL(location, `${this.#baseUrl}${pathname}`)
      return await this.send(redirectUrl.pathname + redirectUrl.search, {method: "GET"})
    }

    if (status >= 400) {
      const bodyText = await response.text()
      throw new InstallerRequestFailedError(pathname, status, bodyText)
    }

    return response
  }

  /**
   * @param {string} artifactsDirectory
   * @returns {Promise<{files: string[], rootDirectory: string}>}
   */
  async captureFailureArtifacts(artifactsDirectory) {
    await mkdir(artifactsDirectory, {recursive: true})
    const requestLogPath = path.join(artifactsDirectory, "playwright-request.log")
    const consoleLogPath = path.join(artifactsDirectory, "playwright-console.log")
    const screenshotPath = path.join(artifactsDirectory, "playwright-screenshot.png")

    await writeFile(requestLogPath, this.#buildRequestLogOutput(), {encoding: "utf8"})

    const targetUrl = new URL(this.#lastPathname, `${this.#baseUrl}/`).toString()
    const consoleMessages = []
    let screenshotCaptured = false
    let screenshotErrorMessage = ""

    try {
      const browser = await chromium.launch({headless: true})
      try {
        const page = await browser.newPage()
        page.on("console", message => {
          consoleMessages.push(`[${message.type()}] ${message.text()}`)
        })
        await page.goto(targetUrl, {waitUntil: "domcontentloaded", timeout: 15_000})
        await page.screenshot({path: screenshotPath, fullPage: true})
        screenshotCaptured = true
      } finally {
        await browser.close()
      }
    } catch (error) {
      screenshotErrorMessage = this.#normalizeErrorMessage(error)
    }

    await writeFile(consoleLogPath, this.#buildConsoleLogOutput(targetUrl, consoleMessages, screenshotErrorMessage), {encoding: "utf8"})

    const files = [requestLogPath, consoleLogPath]
    if (screenshotCaptured) {
      files.push(screenshotPath)
    }

    return {
      files,
      rootDirectory: artifactsDirectory
    }
  }

  /**
   * @returns {string}
   */
  #buildRequestLogOutput() {
    if (this.#requestLog.length === 0) {
      return "No Playwright requests were captured before failure."
    }

    return this.#requestLog
      .map((entry, index) => `${index + 1}. ${entry.method} ${entry.pathname} -> ${entry.status}`)
      .join("\n")
  }

  /**
   * @param {string} targetUrl
   * @param {string[]} consoleMessages
   * @param {string} screenshotErrorMessage
   * @returns {string}
   */
  #buildConsoleLogOutput(targetUrl, consoleMessages, screenshotErrorMessage) {
    const sections = [
      `Target URL: ${targetUrl}`
    ]

    if (screenshotErrorMessage) {
      sections.push(`Screenshot capture failed: ${screenshotErrorMessage}`)
    }

    if (consoleMessages.length === 0) {
      sections.push("No browser console messages captured.")
    } else {
      sections.push(...consoleMessages)
    }

    return sections.join("\n")
  }

  /**
   * @param {unknown} error
   * @returns {string}
   */
  #normalizeErrorMessage(error) {
    if (error instanceof Error) {
      return error.message
    }

    return String(error)
  }

  /**
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.#requestContext) {
      return
    }
    await this.#requestContext.dispose()
    this.#requestContext = null
  }
}
