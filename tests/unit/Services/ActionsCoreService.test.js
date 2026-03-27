import {jest} from "@jest/globals"

const loadService = async ({
  getInput = jest.fn(),
  setOutput = jest.fn(),
  setFailed = jest.fn(),
  info = jest.fn(),
  error = jest.fn(),
  warning = jest.fn()
} = {}) => {
  jest.resetModules()
  jest.unstable_mockModule("@actions/core", () => ({
    getInput,
    setOutput,
    setFailed,
    info,
    error,
    warning
  }))

  const {default: ActionsCoreService} = await import("../../../src/Services/ActionsCoreService.js")
  return new ActionsCoreService()
}

describe("ActionsCoreService", () => {
  test("delegates getInput", async () => {
    const getInput = jest.fn().mockReturnValue("value")
    const service = await loadService({getInput})

    expect(service.getInput("url")).toBe("value")
    expect(getInput).toHaveBeenCalledWith("url")
  })

  test("delegates setOutput", async () => {
    const setOutput = jest.fn()
    const service = await loadService({setOutput})

    service.setOutput("app_key", "abc")

    expect(setOutput).toHaveBeenCalledWith("app_key", "abc")
  })

  test("delegates setFailed", async () => {
    const setFailed = jest.fn()
    const service = await loadService({setFailed})

    service.setFailed("failed")

    expect(setFailed).toHaveBeenCalledWith("failed")
  })

  test("delegates info/error/warning", async () => {
    const info = jest.fn()
    const error = jest.fn()
    const warning = jest.fn()
    const service = await loadService({info, error, warning})

    service.info("i")
    service.error("e")
    service.warning("w")

    expect(info).toHaveBeenCalledWith("i")
    expect(error).toHaveBeenCalledWith("e")
    expect(warning).toHaveBeenCalledWith("w")
  })
})
