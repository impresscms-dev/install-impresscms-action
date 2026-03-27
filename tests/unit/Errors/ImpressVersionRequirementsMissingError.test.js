import ImpressVersionRequirementsMissingError from "../../../src/Errors/ImpressVersionRequirementsMissingError.js"

describe("ImpressVersionRequirementsMissingError", () => {
  test("creates expected message", () => {
    const error = new ImpressVersionRequirementsMissingError("9.9")

    expect(error.name).toBe("ImpressVersionRequirementsMissingError")
    expect(error.message).toBe("No PHP requirements mapping found for ImpressCMS version 9.9")
  })
})
