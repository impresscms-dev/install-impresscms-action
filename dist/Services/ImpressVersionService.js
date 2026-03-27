import {existsSync, readFileSync} from "node:fs"
import path from "node:path"
import ImpressVersionNotDetectedError from "../Errors/ImpressVersionNotDetectedError.js"

export default class ImpressVersionService {
  /**
   * @param {import("./ActionsCoreService.js").default} actionsCore
   */
  constructor(actionsCore) {
    this.actionsCore = actionsCore
  }

  /**
   * @param {string} projectPath
   * @returns {string}
   */
  detect(projectPath) {
    const legacyVersion = this.#detectFromLegacyVersionFiles(projectPath)
    if (legacyVersion) {
      return legacyVersion
    }

    const composerVersion = this.#detectFromComposerFiles(projectPath)
    if (composerVersion) {
      return composerVersion
    }

    throw new ImpressVersionNotDetectedError()
  }

  /**
   * @param {string} projectPath
   * @returns {string}
   */
  detectMajorMinor(projectPath) {
    return this.toMajorMinor(this.detect(projectPath))
  }

  /**
   * @param {string} version
   * @returns {string}
   */
  toMajorMinor(version) {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/)
    if (!match) {
      throw new ImpressVersionNotDetectedError()
    }

    const [, major, minor] = match
    return `${major}.${minor}`
  }

  /**
   * @param {string} projectPath
   * @returns {string | null}
   */
  #detectFromLegacyVersionFiles(projectPath) {
    const versionFileCandidates = [
      path.join(projectPath, "htdocs", "include", "version.php"),
      path.join(projectPath, "include", "version.php")
    ]

    for (const filePath of versionFileCandidates) {
      if (!existsSync(filePath)) {
        continue
      }

      const contents = readFileSync(filePath, {encoding: "utf8"})
      const fullVersionMatch = contents.match(/ImpressCMS\s+(\d+\.\d+(?:\.\d+)?)/i)
      if (!fullVersionMatch) {
        continue
      }

      const [, version] = fullVersionMatch
      const semver = this.#extractSemver(version)
      if (semver) {
        return semver
      }
    }

    return null
  }

  /**
   * @param {string} projectPath
   * @returns {string | null}
   */
  #detectFromComposerFiles(projectPath) {
    const composerJson = this.#readJsonFile(path.join(projectPath, "composer.json"))
    const composerJsonVersion = this.#detectFromComposerJson(composerJson)
    if (composerJsonVersion) {
      return composerJsonVersion
    }

    const composerLock = this.#readJsonFile(path.join(projectPath, "composer.lock"))
    const composerLockVersion = this.#detectFromComposerLock(composerLock)
    if (composerLockVersion) {
      return composerLockVersion
    }

    return null
  }

  /**
   * @param {Record<string, unknown> | null} composerJson
   * @returns {string | null}
   */
  #detectFromComposerJson(composerJson) {
    if (!composerJson) {
      return null
    }

    const candidates = [
      composerJson.version,
      composerJson?.extra?.version,
      composerJson?.require?.["impresscms/impresscms"],
      composerJson?.["require-dev"]?.["impresscms/impresscms"],
      ...Object.values(composerJson?.extra?.["branch-alias"] ?? {})
    ]

    return this.#detectSemverFromCandidates(candidates)
  }

  /**
   * @param {Record<string, unknown> | null} composerLock
   * @returns {string | null}
   */
  #detectFromComposerLock(composerLock) {
    if (!composerLock) {
      return null
    }

    const packages = [
      ...(composerLock.packages ?? []),
      ...(composerLock["packages-dev"] ?? [])
    ]

    const impressPackage = packages.find(pkg => pkg?.name === "impresscms/impresscms")
    const candidates = [
      composerLock?.root?.version,
      impressPackage?.version
    ]

    return this.#detectSemverFromCandidates(candidates)
  }

  /**
   * @param {unknown[]} candidates
   * @returns {string | null}
   */
  #detectSemverFromCandidates(candidates) {
    for (const candidate of candidates) {
      const version = this.#extractSemver(candidate)
      if (version) {
        return version
      }
    }

    return null
  }

  /**
   * @param {string} filePath
   * @returns {Record<string, unknown> | null}
   */
  #readJsonFile(filePath) {
    if (!existsSync(filePath)) {
      return null
    }

    try {
      const contents = readFileSync(filePath, {encoding: "utf8"})
      return JSON.parse(contents)
    } catch (error) {
      this.actionsCore.warning(`Unable to parse JSON file ${filePath}: ${error.message}`)
      return null
    }
  }

  /**
   * @param {unknown} value
   * @returns {string | null}
   */
  #extractSemver(value) {
    if (typeof value !== "string") {
      return null
    }

    const match = value.match(/(\d+)\.(\d+)(?:\.(\d+))?/)
    if (!match) {
      return null
    }

    const [, major, minor, patch = "0"] = match
    return `${major}.${minor}.${patch}`
  }
}
