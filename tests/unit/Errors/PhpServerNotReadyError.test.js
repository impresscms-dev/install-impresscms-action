import PhpServerNotReadyError from "../../../src/Errors/PhpServerNotReadyError.js"

describe("PhpServerNotReadyError", () => {
  test("creates expected message", () => {
    const error = new PhpServerNotReadyError()

    expect(error.name).toBe("PhpServerNotReadyError")
    expect(error.message).toBe("PHP built-in server did not become ready in time")
  })
})
