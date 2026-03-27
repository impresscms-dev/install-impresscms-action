import {request as playwrightRequest} from "playwright"
import RedirectLocationMissingError from "../Errors/RedirectLocationMissingError.js"
import InstallerRequestFailedError from "../Errors/InstallerRequestFailedError.js"

export default class PlaywrightInstallerClientInstance {
  #baseUrl
  #requestContext

  /**
   * @param {string} baseUrl
   */
  constructor(baseUrl) {
    this.#baseUrl = baseUrl
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

    const response = await this.#requestContext.fetch(pathname, {
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
