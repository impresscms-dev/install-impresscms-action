import NoSupportedStrategyError from "../../../src/Errors/NoSupportedStrategyError.js"

describe("NoSupportedStrategyError", () => {
  test("creates expected message", () => {
    const error = new NoSupportedStrategyError()

    expect(error.name).toBe("NoSupportedStrategyError")
    expect(error.message).toBe("No supported strategy was found for this ImpressCMS checkout")
  })
})
