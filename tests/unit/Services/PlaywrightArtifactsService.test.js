import {jest} from "@jest/globals"

const loadService = async ({
  uploadArtifactImpl = jest.fn().mockResolvedValue({size: 123}),
  mkdtempImpl = jest.fn().mockResolvedValue("/tmp/icms-pw-artifacts")
} = {}) => {
  jest.resetModules()
  const uploadArtifact = jest.fn(uploadArtifactImpl)
  const DefaultArtifactClient = jest.fn().mockImplementation(() => ({
    uploadArtifact
  }))
  const mkdtemp = jest.fn(mkdtempImpl)

  jest.unstable_mockModule("@actions/artifact", () => ({
    DefaultArtifactClient
  }))
  jest.unstable_mockModule("node:fs/promises", () => ({
    mkdtemp
  }))
  jest.unstable_mockModule("node:os", () => ({
    tmpdir: () => "/tmp"
  }))

  const {default: PlaywrightArtifactsService} = await import("../../../src/Services/PlaywrightArtifactsService.js")
  return {PlaywrightArtifactsService, uploadArtifact, DefaultArtifactClient, mkdtemp}
}

describe("PlaywrightArtifactsService", () => {
  test("uploads captured artifacts", async () => {
    const {PlaywrightArtifactsService, uploadArtifact, DefaultArtifactClient, mkdtemp} = await loadService()
    const info = jest.fn()
    const warning = jest.fn()
    const actionsCore = {info, warning}
    const runIdGetter = jest.fn().mockReturnValue("123")
    const runAttemptGetter = jest.fn().mockReturnValue("2")
    const gitHubContextService = {}
    Object.defineProperty(gitHubContextService, "runId", {get: runIdGetter})
    Object.defineProperty(gitHubContextService, "runAttempt", {get: runAttemptGetter})
    const service = new PlaywrightArtifactsService(actionsCore, gitHubContextService)
    const playwrightInstallerClient = {
      captureFailureArtifacts: jest.fn().mockResolvedValue({
        files: ["/tmp/pw/playwright-console.log", "/tmp/pw/playwright-screenshot.png"],
        rootDirectory: "/tmp/pw"
      })
    }

    await service.uploadFailureArtifacts(playwrightInstallerClient)

    expect(DefaultArtifactClient).toHaveBeenCalledTimes(1)
    expect(uploadArtifact).toHaveBeenCalledTimes(1)
    expect(uploadArtifact).toHaveBeenCalledWith(
      expect.stringMatching(/^install-impresscms-playwright-debug-123-2-\d+$/),
      ["/tmp/pw/playwright-console.log", "/tmp/pw/playwright-screenshot.png"],
      "/tmp/pw"
    )
    expect(mkdtemp).toHaveBeenCalledWith(expect.stringContaining("install-impresscms-playwright-"))
    expect(runIdGetter).toHaveBeenCalledTimes(1)
    expect(runAttemptGetter).toHaveBeenCalledTimes(1)
    expect(info).toHaveBeenCalledWith(expect.stringContaining("Uploaded Playwright debug artifacts"))
    expect(warning).not.toHaveBeenCalled()
  })

  test("logs warning when no files were generated", async () => {
    const {PlaywrightArtifactsService, uploadArtifact} = await loadService()
    const info = jest.fn()
    const warning = jest.fn()
    const gitHubContextService = {}
    Object.defineProperty(gitHubContextService, "runId", {get: () => "123"})
    Object.defineProperty(gitHubContextService, "runAttempt", {get: () => "2"})
    const service = new PlaywrightArtifactsService(
      {info, warning},
      gitHubContextService
    )
    const playwrightInstallerClient = {
      captureFailureArtifacts: jest.fn().mockResolvedValue({
        files: [],
        rootDirectory: "/tmp/pw"
      })
    }

    await service.uploadFailureArtifacts(playwrightInstallerClient)

    expect(uploadArtifact).not.toHaveBeenCalled()
    expect(warning).toHaveBeenCalledWith("No Playwright debug artifacts were generated for upload.")
  })

  test("logs warning when artifact upload flow fails", async () => {
    const {PlaywrightArtifactsService} = await loadService({
      mkdtempImpl: jest.fn().mockRejectedValue(new Error("temp dir failed"))
    })
    const warning = jest.fn()
    const gitHubContextService = {}
    Object.defineProperty(gitHubContextService, "runId", {get: () => "123"})
    Object.defineProperty(gitHubContextService, "runAttempt", {get: () => "2"})
    const service = new PlaywrightArtifactsService(
      {info: jest.fn(), warning},
      gitHubContextService
    )
    const playwrightInstallerClient = {
      captureFailureArtifacts: jest.fn().mockRejectedValue(new Error("capture failed"))
    }

    await service.uploadFailureArtifacts(playwrightInstallerClient)

    expect(warning).toHaveBeenCalledWith(expect.stringContaining("Unable to upload Playwright debug artifacts: temp dir failed"))
  })
})
