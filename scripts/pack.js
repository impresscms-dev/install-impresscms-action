import {cpSync, mkdirSync} from "node:fs"
import path from "node:path"
import process from "node:process"

const args = new Set(process.argv.slice(2))

if (args.has("--format") || args.has("--format-check")) {
  // Formatting is added later; keep workflow scripts working before prettier/eslint setup.
  process.exit(0)
}

const rootPath = process.cwd()
const srcPath = path.join(rootPath, "src")
const distPath = path.join(rootPath, "dist")

mkdirSync(distPath, {recursive: true})
cpSync(srcPath, distPath, {recursive: true, force: true})
