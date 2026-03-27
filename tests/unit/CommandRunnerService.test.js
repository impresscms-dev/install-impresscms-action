import {jest} from "@jest/globals"

const createFakeChildProcess = () => {
  const stdoutListeners = []
  const stderrListeners = []
  const closeListeners = []
  const errorListeners = []

  return {
    process: {
      stdout: {
        on: (event, callback) => {
          if (event === "data") {
            stdoutListeners.push(callback)
          }
        }
      },
      stderr: {
        on: (event, callback) => {
          if (event === "data") {
            stderrListeners.push(callback)
          }
        }
      },
      on: (event, callback) => {
        if (event === "close") {
          closeListeners.push(callback)
        }
        if (event === "error") {
          errorListeners.push(callback)
        }
      }
    },
    emitStdout: payload => {
      for (const listener of stdoutListeners) {
        listener(Buffer.from(payload))
      }
    },
    emitStderr: payload => {
      for (const listener of stderrListeners) {
        listener(Buffer.from(payload))
      }
    },
    emitClose: code => {
      for (const listener of closeListeners) {
        listener(code)
      }
    },
    emitError: error => {
      for (const listener of errorListeners) {
        listener(error)
      }
    }
  }
}

const loadService = async ({spawnMock, infoMock, errorMock}) => {
  jest.resetModules()
  jest.unstable_mockModule("node:child_process", () => ({
    spawn: spawnMock
  }))

  const {default: CommandRunnerService} = await import("../../src/Services/CommandRunnerService.js")
  return new CommandRunnerService({
    info: infoMock,
    error: errorMock
  })
}

describe("CommandRunnerService", () => {
  test("returns stdout and stderr for successful command", async () => {
    const fakeChild = createFakeChildProcess()
    const spawnMock = jest.fn(() => fakeChild.process)
    const infoMock = jest.fn()
    const errorMock = jest.fn()
    const service = await loadService({spawnMock, infoMock, errorMock})

    const promise = service.run("php", ["-v"], {cwd: "/tmp/project"})
    fakeChild.emitStdout("line from stdout\n")
    fakeChild.emitStderr("line from stderr\n")
    fakeChild.emitClose(0)

    await expect(promise).resolves.toEqual({
      stdout: "line from stdout\n",
      stderr: "line from stderr\n"
    })
    expect(spawnMock).toHaveBeenCalledWith("php", ["-v"], {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: "/tmp/project"
    })
    expect(infoMock).toHaveBeenCalledWith("line from stdout")
    expect(errorMock).toHaveBeenCalledWith("line from stderr")
  })

  test("rejects with typed failure on non-zero exit code", async () => {
    const fakeChild = createFakeChildProcess()
    const spawnMock = jest.fn(() => fakeChild.process)
    const infoMock = jest.fn()
    const errorMock = jest.fn()
    const service = await loadService({spawnMock, infoMock, errorMock})

    const promise = service.run("composer", ["install"])
    fakeChild.emitStderr("install failed\n")
    fakeChild.emitClose(1)

    await expect(promise).rejects.toThrow("Command failed: composer install")
  })
})
