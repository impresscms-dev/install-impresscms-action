import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from "node:fs"
import os from "node:os"
import path from "node:path"
import FilePermissionService from "../../src/Services/FilePermissionService.js"

describe("FilePermissionService", () => {
  test("does not throw for a missing path", () => {
    expect(() => {
      FilePermissionService.chmodRecursive("C:/definitely/missing/path")
    }).not.toThrow()
  })

  test("does not throw for an existing directory tree", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "icms-perms-"))
    const nestedDir = path.join(tempDir, "nested")
    const filePath = path.join(nestedDir, "file.txt")

    mkdirSync(nestedDir, {recursive: true})
    writeFileSync(filePath, "ok", {encoding: "utf8"})

    try {
      expect(() => {
        FilePermissionService.chmodRecursive(tempDir)
      }).not.toThrow()
    } finally {
      rmSync(tempDir, {recursive: true, force: true})
    }
  })
})
