import InstallerRequestFailedError from "../../../src/Errors/InstallerRequestFailedError.js"

describe("InstallerRequestFailedError", () => {
  test("creates expected message", () => {
    const error = new InstallerRequestFailedError("/install/page", 500, "boom")

    expect(error.name).toBe("InstallerRequestFailedError")
    expect(error.message).toContain("HTTP 500")
    expect(error.message).toContain("boom")
  })
})
