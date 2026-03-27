import {existsSync} from "node:fs"
import path from "node:path"
import process from "node:process"
import AbstractStrategy from "./AbstractStrategy.js"
import ResultsDto from "../DTO/ResultsDto.js"

export default class TngStrategy extends AbstractStrategy {
  /**
   * @param {import("../Services/FilePermissionService.js").default} filePermissionService
   * @param {import("../Services/CommandRunnerService.js").default} commandRunnerService
   */
  constructor(filePermissionService, commandRunnerService) {
    super()
    this.filePermissionService = filePermissionService
    this.commandRunnerService = commandRunnerService
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @param {string} projectPath
   * @returns {Promise<boolean>}
   */
  async isSupported(inputDto, projectPath) {
    void inputDto
    const hasComposer = existsSync(path.join(projectPath, "composer.json"))
    const hasPhoenix = existsSync(path.join(projectPath, "bin", "phoenix")) || existsSync(path.join(projectPath, "bin", "phoenix.bat"))
    return hasComposer && hasPhoenix
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @param {string} projectPath
   * @returns {Promise<ResultsDto>}
   */
  async apply(inputDto, projectPath) {
    await this.installComposerDependencies(projectPath)
    const appKey = await this.resolveAppKey(inputDto.appKey, projectPath)
    this.ensureWritableFolders(projectPath)
    await this.runPhoenixMigrations(projectPath, this.createPhoenixEnvironment(inputDto, appKey))

    return new ResultsDto({
      appKey,
      usesComposer: true,
      usesPhoenix: true
    })
  }

  /**
   * @param {string} projectPath
   * @returns {Promise<void>}
   */
  async installComposerDependencies(projectPath) {
    await this.commandRunnerService.run("composer", ["install", "--no-progress", "--prefer-dist", "--optimize-autoloader"], {
      cwd: projectPath,
      env: process.env
    })
  }

  /**
   * @param {string} configuredAppKey
   * @param {string} projectPath
   * @returns {Promise<string>}
   */
  async resolveAppKey(configuredAppKey, projectPath) {
    if (configuredAppKey) {
      return configuredAppKey
    }

    try {
      const result = await this.commandRunnerService.run("php", ["./bin/console", "generate:app:key"], {
        cwd: projectPath,
        env: process.env
      })
      return result.stdout.trim().split(/\r?\n/).filter(Boolean).at(-1) ?? ""
    } catch {
      return ""
    }
  }

  /**
   * @param {string} projectPath
   * @returns {void}
   */
  ensureWritableFolders(projectPath) {
    const foldersToChmod = [
      "storage",
      "modules",
      "themes",
      "uploads",
      path.join("htdocs", "modules"),
      path.join("htdocs", "themes"),
      path.join("htdocs", "uploads"),
      path.join("htdocs", "images")
    ]

    for (const folderPath of foldersToChmod) {
      this.filePermissionService.chmodRecursive(path.join(projectPath, folderPath))
    }
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @param {string} appKey
   * @returns {NodeJS.ProcessEnv}
   */
  createPhoenixEnvironment(inputDto, appKey) {
    return {
      ...process.env,
      URL: inputDto.url,
      DB_TYPE: inputDto.databaseType,
      DB_HOST: inputDto.databaseHost,
      DB_USER: inputDto.databaseUser,
      DB_PASS: inputDto.databasePassword,
      DB_PCONNECT: "0",
      DB_NAME: inputDto.databaseName,
      DB_CHARSET: inputDto.databaseCharset,
      DB_COLLATION: inputDto.databaseCollation,
      DB_PREFIX: inputDto.databasePrefix,
      DB_PORT: inputDto.databasePort,
      INSTALL_ADMIN_PASS: inputDto.adminName,
      INSTALL_ADMIN_LOGIN: inputDto.adminLogin,
      INSTALL_ADMIN_NAME: inputDto.adminPass,
      INSTALL_ADMIN_EMAIL: inputDto.adminEmail,
      INSTALL_LANGUAGE: inputDto.language,
      APP_KEY: appKey
    }
  }

  /**
   * @param {string} projectPath
   * @param {NodeJS.ProcessEnv} environment
   * @returns {Promise<void>}
   */
  async runPhoenixMigrations(projectPath, environment) {
    await this.commandRunnerService.run("./bin/phoenix", ["migrate", "-vvv"], {
      cwd: projectPath,
      env: environment
    })
  }
}
