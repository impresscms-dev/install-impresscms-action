import {chmodSync, existsSync, readdirSync, statSync} from "node:fs"
import path from "node:path"
import process from "node:process"

export default class FilePermissionService {
  static chmodRecursive(targetPath) {
    if (!existsSync(targetPath) || process.platform === "win32") {
      return
    }

    try {
      const stats = statSync(targetPath)
      chmodSync(targetPath, 0o777)
      if (stats.isDirectory()) {
        for (const entry of readdirSync(targetPath)) {
          FilePermissionService.chmodRecursive(path.join(targetPath, entry))
        }
      }
    } catch {
      // Best effort; keep behavior of legacy shell scripts that ignored chmod failures.
    }
  }
}
