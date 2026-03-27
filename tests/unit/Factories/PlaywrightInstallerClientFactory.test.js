import {jest} from "@jest/globals"

describe("PlaywrightInstallerClientFactory", () => {
  test("build creates PlaywrightInstallerClientInstance with base url", async () => {
    jest.resetModules()

    const constructorMock = jest.fn()
    jest.unstable_mockModule("../../../src/Infrastructure/PlaywrightInstallerClientInstance.js", () => ({
      default: class PlaywrightInstallerClientInstanceMock {
        constructor(baseUrl) {
          constructorMock(baseUrl)
          this.baseUrl = baseUrl
        }
      }
    }))

    const {default: PlaywrightInstallerClientFactory} = await import("../../../src/Factories/PlaywrightInstallerClientFactory.js")
    const factory = new PlaywrightInstallerClientFactory()
    const instance = factory.build("http://localhost:8080")

    expect(constructorMock).toHaveBeenCalledWith("http://localhost:8080")
    expect(instance.baseUrl).toBe("http://localhost:8080")
  })
})
