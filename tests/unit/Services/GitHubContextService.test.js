import {jest} from "@jest/globals"

const loadService = async ({runId = 0, runAttempt = 0} = {}) => {
  jest.resetModules()
  jest.unstable_mockModule("@actions/github", () => ({
    context: {
      runId,
      runAttempt
    }
  }))

  const {default: GitHubContextService} = await import("../../../src/Services/GitHubContextService.js")
  return new GitHubContextService()
}

describe("GitHubContextService", () => {
  test("returns run id and attempt from GitHub context", async () => {
    const service = await loadService({runId: 123, runAttempt: 2})

    expect(service.runId).toBe("123")
    expect(service.runAttempt).toBe("2")
  })

  test("returns local defaults when context values are missing", async () => {
    const service = await loadService()

    expect(service.runId).toBe("local")
    expect(service.runAttempt).toBe("1")
  })
})
