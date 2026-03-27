import {jest} from "@jest/globals"

const loadService = async ({
  existsSync = jest.fn(),
  statSync = jest.fn(),
  readdirSync = jest.fn(),
  chmodSync = jest.fn(),
  platform = "linux"
} = {}) => {
  jest.resetModules()
  jest.unstable_mockModule("node:fs", () => ({
    existsSync,
    statSync,
    readdirSync,
    chmodSync
  }))
  jest.unstable_mockModule("node:process", () => ({
    default: {
      platform
    }
  }))

  const {default: FilePermissionService} = await import("../../src/Services/FilePermissionService.js")
  return {FilePermissionService, existsSync, statSync, readdirSync, chmodSync}
}

describe("FilePermissionService", () => {
  test("does nothing when target does not exist", async () => {
    const {FilePermissionService, existsSync, chmodSync} = await loadService({
      existsSync: jest.fn().mockReturnValue(false),
      chmodSync: jest.fn()
    })
    const filePermissionService = new FilePermissionService()

    filePermissionService.chmodRecursive("any-path")

    expect(existsSync).toHaveBeenCalledWith("any-path")
    expect(chmodSync).not.toHaveBeenCalled()
  })

  test("recursively chmods directory entries", async () => {
    const {FilePermissionService, chmodSync} = await loadService({
      existsSync: jest.fn().mockReturnValue(true),
      statSync: jest.fn()
        .mockReturnValueOnce({isDirectory: () => true})
        .mockReturnValueOnce({isDirectory: () => false}),
      readdirSync: jest.fn().mockReturnValue(["child.txt"]),
      chmodSync: jest.fn()
    })
    const filePermissionService = new FilePermissionService()

    filePermissionService.chmodRecursive("/tmp/root")

    expect(chmodSync).toHaveBeenCalledTimes(2)
    expect(chmodSync).toHaveBeenNthCalledWith(1, "/tmp/root", 0o777)
  })

  test("swallows fs errors to preserve best-effort behavior", async () => {
    const {FilePermissionService} = await loadService({
      existsSync: jest.fn().mockReturnValue(true),
      statSync: jest.fn().mockImplementation(() => {
        throw new Error("broken stat")
      })
    })
    const filePermissionService = new FilePermissionService()

    expect(() => {
      filePermissionService.chmodRecursive("/tmp/root")
    }).not.toThrow()
  })
})
