import ImpressVersionNotDetectedError from "../../../src/Errors/ImpressVersionNotDetectedError.js"

describe("ImpressVersionNotDetectedError", () => {
  test("creates expected message", () => {
    const error = new ImpressVersionNotDetectedError()

    expect(error.name).toBe("ImpressVersionNotDetectedError")
    expect(error.message).toBe("Unable to detect ImpressCMS version from checked out files")
  })
})
