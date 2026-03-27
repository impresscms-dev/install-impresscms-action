import http from "node:http"
import NetworkService from "../../src/Services/NetworkService.js"
import PhpServerNotReadyError from "../../src/Errors/PhpServerNotReadyError.js"

describe("NetworkService", () => {
  test("getFreePort returns a usable port number", async () => {
    const port = await NetworkService.getFreePort()
    expect(Number.isInteger(port)).toBe(true)
    expect(port).toBeGreaterThan(0)
  })

  test("waitForServer resolves when endpoint becomes available", async () => {
    const port = await NetworkService.getFreePort()
    const server = http.createServer((_, response) => {
      response.statusCode = 200
      response.end("ok")
    })

    await new Promise(resolve => {
      server.listen(port, "127.0.0.1", resolve)
    })

    try {
      await expect(NetworkService.waitForServer(`http://127.0.0.1:${port}`)).resolves.toBeUndefined()
    } finally {
      await new Promise(resolve => server.close(resolve))
    }
  })

  test("waitForServer throws PhpServerNotReadyError for unreachable endpoint", async () => {
    const port = await NetworkService.getFreePort()
    await expect(
      NetworkService.waitForServer(`http://127.0.0.1:${port}/never-up`, 2, 10)
    ).rejects.toBeInstanceOf(PhpServerNotReadyError)
  })
})
