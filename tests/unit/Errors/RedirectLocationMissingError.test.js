import RedirectLocationMissingError from "../../../src/Errors/RedirectLocationMissingError.js"

describe("RedirectLocationMissingError", () => {
  test("creates expected message", () => {
    const error = new RedirectLocationMissingError("/install/page")

    expect(error.name).toBe("RedirectLocationMissingError")
    expect(error.message).toBe("Redirect without location from /install/page")
  })
})
