import PathNotFoundError from "../../../src/Errors/PathNotFoundError.js"

describe("PathNotFoundError", () => {
  test("creates expected message", () => {
    const error = new PathNotFoundError("/missing/path")

    expect(error.name).toBe("PathNotFoundError")
    expect(error.message).toBe("Path does not exist: /missing/path")
  })
})
