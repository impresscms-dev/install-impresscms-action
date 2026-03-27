import {jest} from "@jest/globals"

const loadStrategy = async ({existsSync = jest.fn()} = {}) => {
  jest.resetModules()
  jest.unstable_mockModule("node:fs", () => ({
    existsSync
  }))

  const {default: TngStrategy} = await import("../../../src/strategies/TngStrategy.js")
  return {TngStrategy, existsSync}
}

describe("TngStrategy", () => {
  test("isSupported returns true when composer and phoenix are present", async () => {
    const existsSync = jest.fn(filePath => String(filePath).includes("composer.json") || String(filePath).includes("bin\\phoenix"))
    const {TngStrategy} = await loadStrategy({existsSync})
    const strategy = new TngStrategy({chmodRecursive: jest.fn()}, {run: jest.fn()})

    await expect(strategy.isSupported({}, "/repo")).resolves.toBe(true)
  })

  test("isSupported returns false when composer is missing", async () => {
    const existsSync = jest.fn(filePath => String(filePath).includes("bin\\phoenix"))
    const {TngStrategy} = await loadStrategy({existsSync})
    const strategy = new TngStrategy({chmodRecursive: jest.fn()}, {run: jest.fn()})

    await expect(strategy.isSupported({}, "/repo")).resolves.toBe(false)
  })

  test("apply runs install flow and returns results dto", async () => {
    const {TngStrategy} = await loadStrategy()
    const filePermissionService = {chmodRecursive: jest.fn()}
    const commandRunnerService = {run: jest.fn().mockResolvedValue({stdout: "", stderr: ""})}
    const strategy = new TngStrategy(filePermissionService, commandRunnerService)

    const inputDto = {
      appKey: "fixed-key",
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
      adminEmail: "admin@example.test",
      language: "english"
    }

    const result = await strategy.apply(inputDto, "/repo")

    expect(result).toMatchObject({
      appKey: "fixed-key",
      usesComposer: true,
      usesPhoenix: true
    })
    expect(result.appKey).toBe("fixed-key")
    expect(result.usesComposer).toBe(true)
    expect(result.usesPhoenix).toBe(true)
    expect(commandRunnerService.run).toHaveBeenNthCalledWith(1, "composer", ["install", "--no-progress", "--prefer-dist", "--optimize-autoloader"], expect.any(Object))
    expect(commandRunnerService.run).toHaveBeenNthCalledWith(2, "./bin/phoenix", ["migrate", "-vvv"], expect.any(Object))
    expect(filePermissionService.chmodRecursive).toHaveBeenCalled()
  })

  test("resolveAppKey returns empty string on command failure", async () => {
    const {TngStrategy} = await loadStrategy()
    const strategy = new TngStrategy({chmodRecursive: jest.fn()}, {
      run: jest.fn().mockRejectedValue(new Error("fail"))
    })

    await expect(strategy.resolveAppKey("", "/repo")).resolves.toBe("")
  })
})
