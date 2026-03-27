import {request as playwrightRequest} from "playwright"
import RedirectLocationMissingError from "../Errors/RedirectLocationMissingError.js"
import InstallerRequestFailedError from "../Errors/InstallerRequestFailedError.js"

export default class PlaywrightInstallerClientService {
  /**
   * @param {string} baseUrl
   * @returns {Promise<{send: (pathname: string, options?: {method?: string, formData?: Record<string, string>, followRedirect?: boolean}) => Promise<import("playwright").APIResponse>, dispose: () => Promise<void>}>}
   */
  async create(baseUrl) {
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
