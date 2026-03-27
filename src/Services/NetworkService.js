import net from "node:net"
import PhpServerNotReadyError from "../Errors/PhpServerNotReadyError.js"

export default class NetworkService {
  /**
   * @param {import("./ActionsCoreService.js").default} actionsCore
   */
  constructor(actionsCore) {
    this.actionsCore = actionsCore
  }

  /**
   * @returns {Promise<number>}
   */
  async getFreePort() {
    return await new Promise((resolve, reject) => {
      const server = net.createServer()
      server.listen(0, "127.0.0.1", () => {
        const address = server.address()
        const port = typeof address === "object" && address ? address.port : 0
        server.close(() => resolve(port))
      })
      server.on("error", reject)
    })
  }

  /**
   * Poll an HTTP endpoint until it responds or retries are exhausted.
   *
   * @param {string} url
   * @param {number} retries
   * @param {number} waitMs
   * @returns {Promise<void>}
   */
  async waitForServer(url, retries = 50, waitMs = 150) {
    for (let i = 0; i < retries; i += 1) {
      try {
        const response = await fetch(url, {redirect: "manual"})
        if (response.status >= 200 && response.status < 500) {
          return
        }
      } catch (error) {
        this.actionsCore.warning(`waitForServer attempt ${i + 1} failed for ${url}: ${error.message}`)
      }
      await new Promise(resolve => setTimeout(resolve, waitMs))
    }
    throw new PhpServerNotReadyError()
  }
}
