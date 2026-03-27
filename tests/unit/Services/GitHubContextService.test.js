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

    expect(service.getRunId()).toBe("123")
    expect(service.getRunAttempt()).toBe("2")
  })

  test("returns local defaults when context values are missing", async () => {
    const service = await loadService()

    expect(service.getRunId()).toBe("local")
    expect(service.getRunAttempt()).toBe("1")
  })
})
