import CommandFailedError from "../../../src/Errors/CommandFailedError.js"

describe("CommandFailedError", () => {
  test("creates expected message", () => {
    const error = new CommandFailedError("php", ["-v"], "stderr output")

    expect(error.name).toBe("CommandFailedError")
    expect(error.message).toContain("Command failed: php -v")
    expect(error.message).toContain("stderr output")
  })
})
