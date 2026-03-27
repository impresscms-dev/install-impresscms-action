import {jest} from "@jest/globals"
const loadService = async ({
  existsSync = jest.fn(),
  readFileSync = jest.fn(),
  warning = jest.fn()
} = {}) => {
  jest.resetModules()
  jest.unstable_mockModule("node:fs", () => ({
    existsSync,
    readFileSync
  }))

  const {default: ImpressVersionService} = await import("../../../src/Services/ImpressVersionService.js")
  return {ImpressVersionService, warning}
}

describe("ImpressVersionService", () => {
  test("detects version from legacy version.php", async () => {
    const existsSync = jest.fn(filePath => String(filePath).includes("htdocs") && String(filePath).includes("version.php"))
    const readFileSync = jest.fn(() => "<?php define('XOOPS_VERSION', 'ImpressCMS 1.5.11');")
    const {ImpressVersionService, warning} = await loadService({existsSync, readFileSync})
    const impressVersionService = new ImpressVersionService({warning})

    expect(impressVersionService.detect("/repo")).toBe("1.5.11")
  })

  test("detects version from composer.json version field", async () => {
    const existsSync = jest.fn(filePath => String(filePath).includes("composer.json"))
    const readFileSync = jest.fn(() => JSON.stringify({version: "2.0.3"}))
    const {ImpressVersionService, warning} = await loadService({existsSync, readFileSync})
    const impressVersionService = new ImpressVersionService({warning})

    expect(impressVersionService.detect("/repo")).toBe("2.0.3")
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
    const {ImpressVersionService, warning} = await loadService({existsSync, readFileSync})
    const impressVersionService = new ImpressVersionService({warning})

    expect(impressVersionService.detect("/repo")).toBe("2.0.0")
  })

  test("detects version from composer.lock package info", async () => {
    const existsSync = jest.fn(filePath => String(filePath).includes("composer.lock"))
    const readFileSync = jest.fn(() => JSON.stringify({
      packages: [{name: "impresscms/impresscms", version: "2.0.0"}]
    }))
    const {ImpressVersionService, warning} = await loadService({existsSync, readFileSync})
    const impressVersionService = new ImpressVersionService({warning})

    expect(impressVersionService.detect("/repo")).toBe("2.0.0")
  })

  test("detectMajorMinor returns internal X.Y format from semver", async () => {
    const existsSync = jest.fn(filePath => String(filePath).includes("composer.lock"))
    const readFileSync = jest.fn(() => JSON.stringify({
      packages: [{name: "impresscms/impresscms", version: "2.0.5"}]
    }))
    const {ImpressVersionService, warning} = await loadService({existsSync, readFileSync})
    const impressVersionService = new ImpressVersionService({warning})

    expect(impressVersionService.detectMajorMinor("/repo")).toBe("2.0")
  })

  test("throws typed error when version is not detected", async () => {
    const existsSync = jest.fn(() => false)
    const {ImpressVersionService, warning} = await loadService({existsSync})
    const impressVersionService = new ImpressVersionService({warning})

    expect(() => impressVersionService.detect("/repo")).toThrow("Unable to detect ImpressCMS version from checked out files")
  })

  test("logs warning when composer json cannot be parsed", async () => {
    const warning = jest.fn()
    const existsSync = jest.fn(filePath => String(filePath).includes("composer.json"))
    const readFileSync = jest.fn(() => "{broken json")
    const {ImpressVersionService} = await loadService({existsSync, readFileSync, warning})
    const impressVersionService = new ImpressVersionService({warning})

    expect(() => impressVersionService.detect("/repo")).toThrow("Unable to detect ImpressCMS version from checked out files")
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("Unable to parse JSON file"))
  })
})
