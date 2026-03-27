import {jest} from "@jest/globals"

describe("ApacheContainerFactory", () => {
  test("build creates ApacheContainerInstance with config", async () => {
    jest.resetModules()

    const constructorMock = jest.fn()
    jest.unstable_mockModule("../../../src/Infrastructure/ApacheContainerInstance.js", () => ({
      default: class ApacheContainerInstanceMock {
        constructor(config) {
          constructorMock(config)
          this.config = config
        }
      }
    }))

    const {default: ApacheContainerFactory} = await import("../../../src/Factories/ApacheContainerFactory.js")
    const factory = new ApacheContainerFactory()
    const instance = factory.build({
      phpVersion: "8.3",
      htdocsPath: "/h",
      trustPath: "/t",
      containerRootPath: "/r",
      containerTrustPath: "/tr"
    })

    expect(constructorMock).toHaveBeenCalledWith({
      phpVersion: "8.3",
      htdocsPath: "/h",
      trustPath: "/t",
      containerRootPath: "/r",
      containerTrustPath: "/tr"
    })
    expect(instance.config.phpVersion).toBe("8.3")
  })
})
