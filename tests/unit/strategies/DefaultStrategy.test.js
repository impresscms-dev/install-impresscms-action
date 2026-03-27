import {jest} from "@jest/globals"

const loadStrategy = async ({existsSync = jest.fn(), mkdirSync = jest.fn()} = {}) => {
  jest.resetModules()
  jest.unstable_mockModule("node:fs", () => ({
    existsSync,
    mkdirSync
  }))

  const {default: DefaultStrategy} = await import("../../../src/strategies/DefaultStrategy.js")
  return {DefaultStrategy, existsSync, mkdirSync}
}

const createInputDto = () => ({
  appKey: "fixed-key",
  language: "english",
  url: "http://localhost",
  databaseType: "pdo.mysql",
  databaseHost: "127.0.0.1",
  databaseUser: "user",
  databasePassword: "pass",
  databaseName: "icms",
  databaseCharset: "utf8",
  databaseCollation: "utf8_general_ci",
  databasePrefix: "icms",
  databasePort: "3306",
  adminName: "admin",
  adminLogin: "admin",
  adminPass: "secret",
  adminEmail: "admin@example.test"
})

describe("DefaultStrategy", () => {
  test("isSupported returns true for legacy structure without composer", async () => {
    const existsSync = jest.fn(filePath =>
      String(filePath).includes("htdocs\\install\\page_langselect.php") ||
      String(filePath).includes("htdocs\\mainfile.php")
    )
    const {DefaultStrategy} = await loadStrategy({existsSync})
    const strategy = new DefaultStrategy(
      {waitForServer: jest.fn()},
      {chmodRecursive: jest.fn()},
      {detect: jest.fn().mockReturnValue("2.0.0"), toMajorMinor: jest.fn().mockReturnValue("2.0")},
      {build: jest.fn()},
      {build: jest.fn()},
      {uploadFailureArtifacts: jest.fn()}
    )

    await expect(strategy.isSupported({}, "/repo")).resolves.toBe(true)
  })

  test("isSupported returns false when composer.json exists", async () => {
    const existsSync = jest.fn(filePath =>
      String(filePath).includes("htdocs\\install\\page_langselect.php") ||
      String(filePath).includes("htdocs\\mainfile.php") ||
      String(filePath).includes("composer.json")
    )
    const {DefaultStrategy} = await loadStrategy({existsSync})
    const strategy = new DefaultStrategy(
      {waitForServer: jest.fn()},
      {chmodRecursive: jest.fn()},
      {detect: jest.fn().mockReturnValue("2.0.0"), toMajorMinor: jest.fn().mockReturnValue("2.0")},
      {build: jest.fn()},
      {build: jest.fn()},
      {uploadFailureArtifacts: jest.fn()}
    )

    await expect(strategy.isSupported({}, "/repo")).resolves.toBe(false)
  })

  test("startApacheContainer starts built container with mapped php version", async () => {
    const apacheContainer = {start: jest.fn().mockResolvedValue(undefined)}
    const apacheContainerFactory = {build: jest.fn().mockReturnValue(apacheContainer)}
    const {DefaultStrategy} = await loadStrategy()
    const strategy = new DefaultStrategy(
      {waitForServer: jest.fn()},
      {chmodRecursive: jest.fn()},
      {detect: jest.fn().mockReturnValue("2.0.0"), toMajorMinor: jest.fn().mockReturnValue("2.0")},
      apacheContainerFactory,
      {build: jest.fn()},
      {uploadFailureArtifacts: jest.fn()}
    )

    const paths = {
      projectPath: "/repo",
      htdocsPath: "/repo/htdocs",
      trustPath: "/repo/trust_path",
      containerRootPath: "/var/www/html",
      containerTrustPath: "/var/www/trust_path"
    }
    const result = await strategy.startApacheContainer(paths, "2.0")

    expect(apacheContainerFactory.build).toHaveBeenCalledWith({
      phpVersion: "8.3",
      htdocsPath: "/repo/htdocs",
      trustPath: "/repo/trust_path",
      containerRootPath: "/var/www/html",
      containerTrustPath: "/var/www/trust_path"
    })
    expect(apacheContainer.start).toHaveBeenCalledTimes(1)
    expect(result).toBe(apacheContainer)
  })

  test("runInstaller executes installer flow and stops client", async () => {
    const networkService = {waitForServer: jest.fn().mockResolvedValue(undefined)}
    const client = {
      start: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue({}),
      stop: jest.fn().mockResolvedValue(undefined)
    }
    const {DefaultStrategy} = await loadStrategy()
    const strategy = new DefaultStrategy(
      networkService,
      {chmodRecursive: jest.fn()},
      {detect: jest.fn().mockReturnValue("2.0.0"), toMajorMinor: jest.fn().mockReturnValue("2.0")},
      {build: jest.fn()},
      {build: jest.fn().mockReturnValue(client)},
      {uploadFailureArtifacts: jest.fn()}
    )

    await strategy.runInstaller("http://localhost:8080", {
      containerRootPath: "/var/www/html",
      containerTrustPath: "/var/www/trust_path"
    }, createInputDto())

    expect(networkService.waitForServer).toHaveBeenCalledWith("http://localhost:8080/install/index.php")
    expect(client.start).toHaveBeenCalledTimes(1)
    expect(client.send).toHaveBeenCalled()
    expect(client.send).toHaveBeenCalledWith("/install/page_dbconnection.php", {
      method: "POST",
      formData: expect.objectContaining({
        DB_HOST: "127.0.0.1",
        DB_PORT: "3306"
      })
    })
    expect(client.stop).toHaveBeenCalledTimes(1)
  })

  test("runInstaller uploads playwright artifacts on failure", async () => {
    const networkService = {waitForServer: jest.fn().mockResolvedValue(undefined)}
    const expectedError = new Error("playwright failed")
    const client = {
      start: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockRejectedValue(expectedError),
      stop: jest.fn().mockResolvedValue(undefined)
    }
    const playwrightArtifactsService = {uploadFailureArtifacts: jest.fn().mockResolvedValue(undefined)}
    const {DefaultStrategy} = await loadStrategy()
    const strategy = new DefaultStrategy(
      networkService,
      {chmodRecursive: jest.fn()},
      {detect: jest.fn().mockReturnValue("2.0.0"), toMajorMinor: jest.fn().mockReturnValue("2.0")},
      {build: jest.fn()},
      {build: jest.fn().mockReturnValue(client)},
      playwrightArtifactsService
    )

    await expect(strategy.runInstaller("http://localhost:8080", {
      containerRootPath: "/var/www/html",
      containerTrustPath: "/var/www/trust_path"
    }, createInputDto())).rejects.toThrow("playwright failed")

    expect(playwrightArtifactsService.uploadFailureArtifacts).toHaveBeenCalledWith(client)
    expect(client.stop).toHaveBeenCalledTimes(1)
  })

  test("apply returns results dto and always stops apache server", async () => {
    const {DefaultStrategy} = await loadStrategy()
    const strategy = new DefaultStrategy(
      {waitForServer: jest.fn()},
      {chmodRecursive: jest.fn()},
      {detect: jest.fn().mockReturnValue("2.0.0"), toMajorMinor: jest.fn().mockReturnValue("2.0")},
      {build: jest.fn()},
      {build: jest.fn()},
      {uploadFailureArtifacts: jest.fn()}
    )
    const apacheServer = {
      baseUrl: "http://localhost:8080",
      stop: jest.fn().mockResolvedValue(undefined)
    }

    jest.spyOn(strategy, "resolveLegacyPaths").mockReturnValue({
      trustPath: "/repo/trust_path"
    })
    jest.spyOn(strategy, "ensureTrustPath").mockImplementation(() => {})
    jest.spyOn(strategy, "applyLegacyPermissions").mockResolvedValue(undefined)
    jest.spyOn(strategy, "startApacheContainer").mockResolvedValue(apacheServer)
    jest.spyOn(strategy, "runInstaller").mockResolvedValue(undefined)

    const inputDto = createInputDto()
    const result = await strategy.apply(inputDto, "/repo")

    expect(result.appKey).toBe("fixed-key")
    expect(result.detectedImpresscmsVersion).toBe("2.0.0")
    expect(result.usesComposer).toBe(false)
    expect(result.usesPhoenix).toBe(false)
    expect(strategy.runInstaller).toHaveBeenCalledWith("http://localhost:8080", {trustPath: "/repo/trust_path"}, inputDto, "host.docker.internal")
    expect(apacheServer.stop).toHaveBeenCalledTimes(1)
  })

  test("resolveInstallerDatabaseHost maps localhost values to host alias", async () => {
    const {DefaultStrategy} = await loadStrategy()
    const strategy = new DefaultStrategy(
      {waitForServer: jest.fn()},
      {chmodRecursive: jest.fn()},
      {detect: jest.fn().mockReturnValue("2.0.0"), toMajorMinor: jest.fn().mockReturnValue("2.0")},
      {build: jest.fn()},
      {build: jest.fn()},
      {uploadFailureArtifacts: jest.fn()}
    )

    expect(strategy.resolveInstallerDatabaseHost("localhost")).toBe("host.docker.internal")
    expect(strategy.resolveInstallerDatabaseHost("127.0.0.1")).toBe("host.docker.internal")
    expect(strategy.resolveInstallerDatabaseHost("::1")).toBe("host.docker.internal")
  })

  test("resolveInstallerDatabaseHost keeps non-local host unchanged", async () => {
    const {DefaultStrategy} = await loadStrategy()
    const strategy = new DefaultStrategy(
      {waitForServer: jest.fn()},
      {chmodRecursive: jest.fn()},
      {detect: jest.fn().mockReturnValue("2.0.0"), toMajorMinor: jest.fn().mockReturnValue("2.0")},
      {build: jest.fn()},
      {build: jest.fn()},
      {uploadFailureArtifacts: jest.fn()}
    )

    expect(strategy.resolveInstallerDatabaseHost("mysql")).toBe("mysql")
  })
})
