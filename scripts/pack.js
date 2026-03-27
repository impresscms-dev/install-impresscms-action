import {execFileSync} from "node:child_process"
import {existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync} from "node:fs"
import os from "node:os"
import path from "node:path"
import process from "node:process"

const args = new Set(process.argv.slice(2))
const checkOnly = args.has("--format-check")
const rootPath = process.cwd()
const distPath = path.join(rootPath, "dist")
const tempPath = checkOnly ? mkdtempSync(path.join(os.tmpdir(), "install-impresscms-pack-")) : ""
const outputPath = checkOnly ? tempPath : distPath

class PackValidationError extends Error {}
const nodeEsmGlobalsShim = [
  "import path from \"node:path\";",
  "import {fileURLToPath} from \"node:url\";",
  "const __filename = fileURLToPath(import.meta.url);",
  "const __dirname = path.dirname(__filename);",
  ""
].join("\n")

const ignoredFormatCheckSuffixes = [".node"]
const ignoredFormatCheckPathFragments = ["/build/Release/"]

/**
 * @param {string} outputDirectory
 * @returns {void}
 */
const buildBundle = outputDirectory => {
  rmSync(outputDirectory, {recursive: true, force: true})
  mkdirSync(outputDirectory, {recursive: true})

  execFileSync(process.execPath, [
    path.join(rootPath, "node_modules", "@vercel", "ncc", "dist", "ncc", "cli.js"),
    "build",
    path.join(rootPath, "src", "index.js"),
    "--out",
    outputDirectory
  ], {stdio: "inherit"})

  const entryFilePath = path.join(outputDirectory, "index.js")
  if (existsSync(entryFilePath)) {
    const bundleContent = readFileSync(entryFilePath, "utf8")
    if (bundleContent.includes("const __filename = fileURLToPath(import.meta.url);")) {
      return
    }
    writeFileSync(entryFilePath, `${nodeEsmGlobalsShim}${bundleContent}`, "utf8")
  }
}

/**
 * @param {string} directoryPath
 * @param {string} rootDirectoryPath
 * @returns {Map<string, string>}
 */
const collectFiles = (directoryPath, rootDirectoryPath = directoryPath, shouldIgnoreFile = () => false) => {
  const files = new Map()
  for (const entry of readdirSync(directoryPath, {withFileTypes: true})) {
    const absolutePath = path.join(directoryPath, entry.name)
    if (entry.isDirectory()) {
      for (const [relativePath, fileContent] of collectFiles(absolutePath, rootDirectoryPath, shouldIgnoreFile)) {
        files.set(relativePath, fileContent)
      }
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    const relativePath = path.relative(rootDirectoryPath, absolutePath).replaceAll("\\", "/")
    if (shouldIgnoreFile(relativePath)) {
      continue
    }
    const content = readFileSync(absolutePath, "utf8")
    files.set(relativePath, content)
  }

  return files
}

/**
 * @param {string} expectedPath
 * @param {string} currentPath
 * @returns {void}
 */
const ensureDirectoriesEqual = (expectedPath, currentPath) => {
  if (!existsSync(expectedPath)) {
    throw new PackValidationError("dist directory is missing. Run `npm run pack`.")
  }

  const expectedStats = statSync(expectedPath)
  const currentStats = statSync(currentPath)
  if (!expectedStats.isDirectory() || !currentStats.isDirectory()) {
    throw new PackValidationError("Pack comparison expected directories.")
  }

  const shouldIgnoreFile = relativePath => (
    ignoredFormatCheckSuffixes.some(suffix => relativePath.endsWith(suffix)) ||
    ignoredFormatCheckPathFragments.some(fragment => relativePath.includes(fragment))
  )
  const expectedFiles = collectFiles(expectedPath, expectedPath, shouldIgnoreFile)
  const currentFiles = collectFiles(currentPath, currentPath, shouldIgnoreFile)
  const expectedKeys = Array.from(expectedFiles.keys()).sort()
  const currentKeys = Array.from(currentFiles.keys()).sort()

  if (expectedKeys.length !== currentKeys.length || expectedKeys.some((key, index) => key !== currentKeys[index])) {
    throw new PackValidationError("Packed files mismatch. Run `npm run pack`.")
  }

  for (const key of expectedKeys) {
    if (expectedFiles.get(key) !== currentFiles.get(key)) {
      throw new PackValidationError(`Packed file changed: ${key}. Run \`npm run pack\`.`)
    }
  }
}

try {
  buildBundle(outputPath)
  if (checkOnly) {
    ensureDirectoriesEqual(distPath, outputPath)
  }
} finally {
  if (checkOnly) {
    rmSync(outputPath, {recursive: true, force: true})
  }
}
