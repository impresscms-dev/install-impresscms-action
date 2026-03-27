import {jest} from "@jest/globals"
import net from "node:net"
import NetworkService from "../../src/Services/NetworkService.js"
import PhpServerNotReadyError from "../../src/Errors/PhpServerNotReadyError.js"

describe("NetworkService", () => {
  let networkService

  beforeEach(() => {
    networkService = new NetworkService()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test("getFreePort returns port from mocked server", async () => {
    const fakeServer = {
      listen: jest.fn((port, host, callback) => callback()),
      address: jest.fn(() => ({port: 43123})),
      close: jest.fn(callback => callback()),
      on: jest.fn()
    }
    jest.spyOn(net, "createServer").mockReturnValue(fakeServer)

    await expect(networkService.getFreePort()).resolves.toBe(43123)
    expect(fakeServer.listen).toHaveBeenCalledWith(0, "127.0.0.1", expect.any(Function))
    expect(fakeServer.close).toHaveBeenCalled()
  })

  test("waitForServer resolves when fetch returns successful status", async () => {
    const fetchMock = jest.fn().mockResolvedValue({status: 200})
    global.fetch = fetchMock

    await expect(networkService.waitForServer("http://mocked.local")).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith("http://mocked.local", {redirect: "manual"})
  })

  test("waitForServer retries and throws when endpoint never becomes available", async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error("network down"))
    global.fetch = fetchMock
    jest.spyOn(global, "setTimeout").mockImplementation(callback => {
      callback()
      return 0
    })

    await expect(networkService.waitForServer("http://mocked.local", 3, 1)).rejects.toBeInstanceOf(PhpServerNotReadyError)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
