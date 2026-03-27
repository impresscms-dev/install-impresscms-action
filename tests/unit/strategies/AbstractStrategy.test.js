import AbstractStrategy from "../../../src/strategies/AbstractStrategy.js"

describe("AbstractStrategy", () => {
  test("isSupported throws abstract method error", async () => {
    const strategy = new AbstractStrategy()

    await expect(strategy.isSupported({}, "/repo")).rejects.toThrow("AbstractStrategy.isSupported() must be implemented")
  })

  test("apply throws abstract method error", async () => {
    const strategy = new AbstractStrategy()

    await expect(strategy.apply({}, "/repo")).rejects.toThrow("AbstractStrategy.apply() must be implemented")
  })
})
