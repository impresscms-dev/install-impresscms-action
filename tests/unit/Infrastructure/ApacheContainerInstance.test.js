import {jest} from "@jest/globals"

const loadInstance = async ({startedContainer = null} = {}) => {
  jest.resetModules()

  const startMock = jest.fn().mockResolvedValue(startedContainer ?? {
    getHost: () => "127.0.0.1",
    getMappedPort: () => 43123,
    stop: jest.fn().mockResolvedValue(undefined)
  })

  const withStartupTimeoutMock = jest.fn().mockReturnValue({start: startMock})
  const withExtraHostsMock = jest.fn().mockReturnValue({withStartupTimeout: withStartupTimeoutMock})
  const withBindMountsMock = jest.fn().mockReturnValue({withExtraHosts: withExtraHostsMock})
  const withExposedPortsMock = jest.fn().mockReturnValue({withBindMounts: withBindMountsMock})
  const genericContainerCtor = jest.fn().mockImplementation(() => ({
    withExposedPorts: withExposedPortsMock
  }))

  jest.unstable_mockModule("testcontainers", () => ({
    GenericContainer: genericContainerCtor
  }))

  const {default: ApacheContainerInstance} = await import("../../../src/Infrastructure/ApacheContainerInstance.js")
  return {
    ApacheContainerInstance,
    genericContainerCtor,
    withExposedPortsMock,
    withBindMountsMock,
    withExtraHostsMock,
    withStartupTimeoutMock,
    startMock
  }
}

describe("ApacheContainerInstance", () => {
  test("starts container and exposes baseUrl", async () => {
    const {
      ApacheContainerInstance,
      genericContainerCtor,
      withExposedPortsMock,
      withBindMountsMock,
      withExtraHostsMock,
      withStartupTimeoutMock,
      startMock
    } = await loadInstance()

    const instance = new ApacheContainerInstance({
      phpVersion: "8.3",
      htdocsPath: "/host/htdocs",
      trustPath: "/host/trust_path",
      containerRootPath: "/var/www/html",
      containerTrustPath: "/var/www/trust_path"
    })

    await instance.start()

    expect(genericContainerCtor).toHaveBeenCalledWith("php:8.3-apache")
    expect(withExposedPortsMock).toHaveBeenCalledWith(80)
    expect(withBindMountsMock).toHaveBeenCalledWith([
      {source: "/host/htdocs", target: "/var/www/html"},
      {source: "/host/trust_path", target: "/var/www/trust_path"}
    ])
    expect(withExtraHostsMock).toHaveBeenCalledWith([
      {
        host: "host.docker.internal",
        ipAddress: "host-gateway"
      }
    ])
    expect(withStartupTimeoutMock).toHaveBeenCalledWith(120000)
    expect(startMock).toHaveBeenCalledTimes(1)
    expect(instance.baseUrl).toBe("http://127.0.0.1:43123")
  })

  test("starts container with default and custom extra hosts", async () => {
    const {ApacheContainerInstance, withExtraHostsMock} = await loadInstance()
    const instance = new ApacheContainerInstance({
      phpVersion: "8.3",
      htdocsPath: "/host/htdocs",
      trustPath: "/host/trust_path",
      containerRootPath: "/var/www/html",
      containerTrustPath: "/var/www/trust_path",
      extraHosts: [
        {host: "mysql.local", ipAddress: "host-gateway"}
      ]
    })

    await instance.start()

    expect(withExtraHostsMock).toHaveBeenCalledWith([
      {
        host: "host.docker.internal",
        ipAddress: "host-gateway"
      },
      {
        host: "mysql.local",
        ipAddress: "host-gateway"
      }
    ])
  })

  test("does not start twice when already started", async () => {
    const {ApacheContainerInstance, startMock} = await loadInstance()
    const instance = new ApacheContainerInstance({
      phpVersion: "8.2",
      htdocsPath: "/h",
      trustPath: "/t",
      containerRootPath: "/r",
      containerTrustPath: "/tr"
    })

    await instance.start()
    await instance.start()

    expect(startMock).toHaveBeenCalledTimes(1)
  })

  test("stop is no-op before start and clears baseUrl after stop", async () => {
    const startedContainer = {
      getHost: () => "localhost",
      getMappedPort: () => 8080,
      stop: jest.fn().mockResolvedValue(undefined)
    }
    const {ApacheContainerInstance} = await loadInstance({startedContainer})
    const instance = new ApacheContainerInstance({
      phpVersion: "8.1",
      htdocsPath: "/h",
      trustPath: "/t",
      containerRootPath: "/r",
      containerTrustPath: "/tr"
    })

    await instance.stop()
    await instance.start()
    expect(instance.baseUrl).toBe("http://localhost:8080")
    await instance.stop()

    expect(startedContainer.stop).toHaveBeenCalledTimes(1)
    expect(instance.baseUrl).toBe("")
  })
})
