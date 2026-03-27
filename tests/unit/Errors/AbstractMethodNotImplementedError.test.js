import AbstractMethodNotImplementedError from "../../../src/Errors/AbstractMethodNotImplementedError.js"

describe("AbstractMethodNotImplementedError", () => {
  test("creates expected message", () => {
    const error = new AbstractMethodNotImplementedError("SomeClass", "someMethod")

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe("AbstractMethodNotImplementedError")
    expect(error.message).toBe("SomeClass.someMethod() must be implemented")
  })
})
