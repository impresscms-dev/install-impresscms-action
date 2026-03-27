import StrategyResultTypeError from "../../../src/Errors/StrategyResultTypeError.js"

describe("StrategyResultTypeError", () => {
  test("creates expected message", () => {
    const error = new StrategyResultTypeError("SomeStrategy")

    expect(error.name).toBe("StrategyResultTypeError")
    expect(error.message).toBe("Strategy SomeStrategy must return ResultsDto")
  })
})
