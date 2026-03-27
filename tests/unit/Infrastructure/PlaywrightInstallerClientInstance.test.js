import {join} from "node:path"
import {jest} from "@jest/globals"

const createResponse = ({
  status = 200,
  headers = {},
  text = ""
} = {}) => ({
  status: () => status,
  headers: () => headers,
  text: async () => text
})

const loadInstance = async ({
  fetchImpl = jest.fn(),
  disposeImpl = jest.fn(),
  mkdirImpl = jest.fn().mockResolvedValue(undefined),
  writeFileImpl = jest.fn().mockResolvedValue(undefined),
  gotoImpl = jest.fn().mockResolvedValue(undefined),
  screenshotImpl = jest.fn().mockResolvedValue(undefined)
} = {}) => {
  jest.resetModules()

  const requestContext = {
    fetch: fetchImpl,
    dispose: disposeImpl
  }
  const newContext = jest.fn().mockResolvedValue(requestContext)
  const page = {
    on: jest.fn(),
    goto: gotoImpl,
    screenshot: screenshotImpl
  }
  const browser = {
    newPage: jest.fn().mockResolvedValue(page),
    close: jest.fn().mockResolvedValue(undefined)
  }
  const launch = jest.fn().mockResolvedValue(browser)
  const mkdir = jest.fn(mkdirImpl)
  const writeFile = jest.fn(writeFileImpl)

  jest.unstable_mockModule("playwright", () => ({
    request: {newContext},
    chromium: {launch}
  }))
  jest.unstable_mockModule("node:fs/promises", () => ({
    mkdir,
    writeFile
  }))

  const {default: PlaywrightInstallerClientInstance} = await import("../../../src/Infrastructure/PlaywrightInstallerClientInstance.js")
  return {PlaywrightInstallerClientInstance, newContext, requestContext, launch, page, browser, mkdir, writeFile}
}

describe("PlaywrightInstallerClientInstance", () => {
  test("start creates request context only once", async () => {
    const {PlaywrightInstallerClientInstance, newContext} = await loadInstance()
    const instance = new PlaywrightInstallerClientInstance("http://localhost:1234")

    await instance.start()
    await instance.start()

    expect(newContext).toHaveBeenCalledTimes(1)
    expect(newContext).toHaveBeenCalledWith({baseURL: "http://localhost:1234"})
  })

  test("send auto-starts and performs fetch", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(createResponse())
    const {PlaywrightInstallerClientInstance, newContext} = await loadInstance({fetchImpl})
    const instance = new PlaywrightInstallerClientInstance("http://localhost:1234")

    const response = await instance.send("/install/page_start.php")

    expect(newContext).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledWith("/install/page_start.php", {
      method: "GET",
      form: undefined,
      maxRedirects: 0
    })
    expect(response.status()).toBe(200)
  })

  test("throws redirect error when location header is missing", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(createResponse({status: 302}))
    const {PlaywrightInstallerClientInstance} = await loadInstance({fetchImpl})
    const instance = new PlaywrightInstallerClientInstance("http://localhost:1234")

    await expect(instance.send("/install/page_start.php")).rejects.toMatchObject({
      name: "RedirectLocationMissingError"
    })
  })

  test("follows redirects by default", async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(createResponse({status: 302, headers: {location: "/install/page_next.php"}}))
      .mockResolvedValueOnce(createResponse({status: 200}))

    const {PlaywrightInstallerClientInstance} = await loadInstance({fetchImpl})
    const instance = new PlaywrightInstallerClientInstance("http://localhost:1234")

    const response = await instance.send("/install/page_start.php")

    expect(fetchImpl).toHaveBeenNthCalledWith(1, "/install/page_start.php", {
      method: "GET",
      form: undefined,
      maxRedirects: 0
    })
    expect(fetchImpl).toHaveBeenNthCalledWith(2, "/install/page_next.php", {
      method: "GET",
      form: undefined,
      maxRedirects: 0
    })
    expect(response.status()).toBe(200)
  })

  test("does not follow redirects when disabled", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(createResponse({
      status: 302,
      headers: {location: "/install/page_next.php"}
    }))
    const {PlaywrightInstallerClientInstance} = await loadInstance({fetchImpl})
    const instance = new PlaywrightInstallerClientInstance("http://localhost:1234")

    const response = await instance.send("/install/page_start.php", {followRedirect: false})

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(response.status()).toBe(302)
  })

  test("throws installer error for HTTP >= 400", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(createResponse({
      status: 500,
      text: "boom"
    }))
    const {PlaywrightInstallerClientInstance} = await loadInstance({fetchImpl})
    const instance = new PlaywrightInstallerClientInstance("http://localhost:1234")

    await expect(instance.send("/install/page_start.php")).rejects.toMatchObject({
      name: "InstallerRequestFailedError"
    })
  })

  test("stop is no-op before start and disposes when started", async () => {
    const disposeImpl = jest.fn().mockResolvedValue(undefined)
    const {PlaywrightInstallerClientInstance, newContext} = await loadInstance({disposeImpl})
    const instance = new PlaywrightInstallerClientInstance("http://localhost:1234")

    await instance.stop()
    expect(disposeImpl).not.toHaveBeenCalled()

    await instance.start()
    await instance.stop()
    await instance.start()

    expect(disposeImpl).toHaveBeenCalledTimes(1)
    expect(newContext).toHaveBeenCalledTimes(2)
  })

  test("captureFailureArtifacts writes request and console logs with screenshot", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(createResponse({status: 200}))
    const {PlaywrightInstallerClientInstance, launch, page, mkdir, writeFile} = await loadInstance({fetchImpl})
    const instance = new PlaywrightInstallerClientInstance("http://localhost:1234")
    await instance.send("/install/page_start.php")

    const artifactsDirectory = "/tmp/icms-pw-artifacts"
    const {files, rootDirectory} = await instance.captureFailureArtifacts(artifactsDirectory)

    expect(rootDirectory).toBe(artifactsDirectory)
    expect(files).toEqual(expect.arrayContaining([
      join(artifactsDirectory, "playwright-request.log"),
      join(artifactsDirectory, "playwright-console.log"),
      join(artifactsDirectory, "playwright-screenshot.png")
    ]))
    expect(launch).toHaveBeenCalledWith({headless: true})
    expect(page.goto).toHaveBeenCalledWith("http://localhost:1234/install/page_start.php", {
      waitUntil: "domcontentloaded",
      timeout: 15000
    })
    expect(mkdir).toHaveBeenCalledWith(artifactsDirectory, {recursive: true})
    expect(writeFile).toHaveBeenCalledWith(
      join(artifactsDirectory, "playwright-request.log"),
      expect.stringContaining("GET /install/page_start.php -> 200"),
      {encoding: "utf8"}
    )
  })

  test("captureFailureArtifacts logs screenshot failure and returns log files", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(createResponse({status: 200}))
    const launchError = new Error("browser failed")
    const {PlaywrightInstallerClientInstance, writeFile} = await loadInstance({
      fetchImpl,
      gotoImpl: jest.fn().mockRejectedValue(launchError)
    })
    const instance = new PlaywrightInstallerClientInstance("http://localhost:1234")
    await instance.send("/install/page_start.php")

    const artifactsDirectory = "/tmp/icms-pw-artifacts"
    const {files} = await instance.captureFailureArtifacts(artifactsDirectory)

    expect(files).toEqual(expect.arrayContaining([
      join(artifactsDirectory, "playwright-request.log"),
      join(artifactsDirectory, "playwright-console.log")
    ]))
    expect(files).not.toContain(join(artifactsDirectory, "playwright-screenshot.png"))
    expect(writeFile).toHaveBeenCalledWith(
      join(artifactsDirectory, "playwright-console.log"),
      expect.stringContaining("Screenshot capture failed: browser failed"),
      {encoding: "utf8"}
    )
  })
})
