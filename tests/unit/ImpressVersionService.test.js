import {jest} from "@jest/globals"
const loadService = async ({
  existsSync = jest.fn(),
  readFileSync = jest.fn()
} = {}) => {
  jest.resetModules()
  jest.unstable_mockModule("node:fs", () => ({
    existsSync,
    readFileSync
  }))

  const {default: ImpressVersionService} = await import("../../src/Services/ImpressVersionService.js")
  return {ImpressVersionService}
}

describe("ImpressVersionService", () => {
  test("detects version from legacy version.php", async () => {
    const existsSync = jest.fn(filePath => String(filePath).includes("htdocs") && String(filePath).includes("version.php"))
    const readFileSync = jest.fn(() => "<?php define('XOOPS_VERSION', 'ImpressCMS 1.5.11');")
    const {ImpressVersionService} = await loadService({existsSync, readFileSync})
    const impressVersionService = new ImpressVersionService()

    expect(impressVersionService.detect("/repo")).toBe("1.5")
  })

  test("detects version from composer.json version field", async () => {
    const existsSync = jest.fn(filePath => String(filePath).includes("composer.json"))
    const readFileSync = jest.fn(() => JSON.stringify({version: "2.0.3"}))
    const {ImpressVersionService} = await loadService({existsSync, readFileSync})
    const impressVersionService = new ImpressVersionService()

    expect(impressVersionService.detect("/repo")).toBe("2.0")
  })

  test("detects version from composer branch-alias", async () => {
    const existsSync = jest.fn(filePath => String(filePath).includes("composer.json"))
    const readFileSync = jest.fn(() => JSON.stringify({
      extra: {
        "branch-alias": {
          "dev-main": "2.0.x-dev"
        }
      }
    }))
    const {ImpressVersionService} = await loadService({existsSync, readFileSync})
    const impressVersionService = new ImpressVersionService()

    expect(impressVersionService.detect("/repo")).toBe("2.0")
  })

  test("detects version from composer.lock package info", async () => {
    const existsSync = jest.fn(filePath => String(filePath).includes("composer.lock"))
    const readFileSync = jest.fn(() => JSON.stringify({
      packages: [{name: "impresscms/impresscms", version: "2.0.0"}]
    }))
    const {ImpressVersionService} = await loadService({existsSync, readFileSync})
    const impressVersionService = new ImpressVersionService()

    expect(impressVersionService.detect("/repo")).toBe("2.0")
  })

  test("throws typed error when version is not detected", async () => {
    const existsSync = jest.fn(() => false)
    const {ImpressVersionService} = await loadService({existsSync})
    const impressVersionService = new ImpressVersionService()

    expect(() => impressVersionService.detect("/repo")).toThrow("Unable to detect ImpressCMS version from checked out files")
  })
})
