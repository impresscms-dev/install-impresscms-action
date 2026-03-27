import AbstractMethodNotImplementedError from "../../src/Errors/AbstractMethodNotImplementedError.js"
import CommandFailedError from "../../src/Errors/CommandFailedError.js"
import InstallerRequestFailedError from "../../src/Errors/InstallerRequestFailedError.js"
import NoSupportedStrategyError from "../../src/Errors/NoSupportedStrategyError.js"
import PathNotFoundError from "../../src/Errors/PathNotFoundError.js"
import PhpServerNotReadyError from "../../src/Errors/PhpServerNotReadyError.js"
import RedirectLocationMissingError from "../../src/Errors/RedirectLocationMissingError.js"
import StrategyResultTypeError from "../../src/Errors/StrategyResultTypeError.js"

describe("Error classes", () => {
  test("AbstractMethodNotImplementedError", () => {
    const error = new AbstractMethodNotImplementedError("SomeClass", "someMethod")
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe("AbstractMethodNotImplementedError")
    expect(error.message).toBe("SomeClass.someMethod() must be implemented")
  })

  test("CommandFailedError", () => {
    const error = new CommandFailedError("php", ["-v"], "stderr output")
    expect(error.name).toBe("CommandFailedError")
    expect(error.message).toContain("Command failed: php -v")
    expect(error.message).toContain("stderr output")
  })

  test("InstallerRequestFailedError", () => {
    const error = new InstallerRequestFailedError("/install/page", 500, "boom")
    expect(error.name).toBe("InstallerRequestFailedError")
    expect(error.message).toContain("HTTP 500")
    expect(error.message).toContain("boom")
  })

  test("NoSupportedStrategyError", () => {
    const error = new NoSupportedStrategyError()
    expect(error.name).toBe("NoSupportedStrategyError")
    expect(error.message).toBe("No supported strategy was found for this ImpressCMS checkout")
  })

  test("PathNotFoundError", () => {
    const error = new PathNotFoundError("/missing/path")
    expect(error.name).toBe("PathNotFoundError")
    expect(error.message).toBe("Path does not exist: /missing/path")
  })

  test("PhpServerNotReadyError", () => {
    const error = new PhpServerNotReadyError()
    expect(error.name).toBe("PhpServerNotReadyError")
    expect(error.message).toBe("PHP built-in server did not become ready in time")
  })

  test("RedirectLocationMissingError", () => {
    const error = new RedirectLocationMissingError("/install/page")
    expect(error.name).toBe("RedirectLocationMissingError")
    expect(error.message).toBe("Redirect without location from /install/page")
  })

  test("StrategyResultTypeError", () => {
    const error = new StrategyResultTypeError("SomeStrategy")
    expect(error.name).toBe("StrategyResultTypeError")
    expect(error.message).toBe("Strategy SomeStrategy must return ResultsDto")
  })
})
