import {existsSync} from "node:fs"
import path from "node:path"
import process from "node:process"
import AbstractStrategy from "./AbstractStrategy.js"
import ResultsDto from "../DTO/ResultsDto.js"
import FilePermissionService from "../Services/FilePermissionService.js"

export default class TngStrategy extends AbstractStrategy {
  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @returns {Promise<boolean>}
   */
  async isSupported(inputDto) {
    void inputDto
    const {projectPath} = this.context
    const hasComposer = existsSync(path.join(projectPath, "composer.json"))
    const hasPhoenix = existsSync(path.join(projectPath, "bin", "phoenix")) || existsSync(path.join(projectPath, "bin", "phoenix.bat"))
    return hasComposer && hasPhoenix
  }

  /**
   * @param {import("../DTO/InputDto.js").default} inputDto
   * @returns {Promise<ResultsDto>}
   */
  async apply(inputDto) {
    await this.installComposerDependencies()
    const appKey = await this.resolveAppKey(inputDto.getAppKey())
    this.ensureWritableFolders()
    await this.runPhoenixMigrations(this.createPhoenixEnvironment(inputDto, appKey))

    return new ResultsDto({
      appKey,
      usesComposer: true,
      usesPhoenix: true
    })
  }

  /**
   * @returns {Promise<void>}
   */
  async installComposerDependencies() {
    const {projectPath, runCommand} = this.context
    await runCommand("composer", ["install", "--no-progress", "--prefer-dist", "--optimize-autoloader"], {
      cwd: projectPath,
      env: process.env
    })
  }

  /**
   * @param {string} configuredAppKey
   * @returns {Promise<string>}
   */
  async resolveAppKey(configuredAppKey) {
    if (configuredAppKey) {
      return configuredAppKey
    }

    const {projectPath, runCommand} = this.context
    try {
      const result = await runCommand("php", ["./bin/console", "generate:app:key"], {
        cwd: projectPath,
        env: process.env
      })
      return result.stdout.trim().split(/\r?\n/).filter(Boolean).at(-1) ?? ""
    } catch {
      return ""
    }
  }

  /**
   * @returns {void}
   */
  ensureWritableFolders() {
    const {projectPath} = this.context
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
      FilePermissionService.chmodRecursive(path.join(projectPath, folderPath))
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
      URL: inputDto.getUrl(),
      DB_TYPE: inputDto.getDatabaseType(),
      DB_HOST: inputDto.getDatabaseHost(),
      DB_USER: inputDto.getDatabaseUser(),
      DB_PASS: inputDto.getDatabasePassword(),
      DB_PCONNECT: "0",
      DB_NAME: inputDto.getDatabaseName(),
      DB_CHARSET: inputDto.getDatabaseCharset(),
      DB_COLLATION: inputDto.getDatabaseCollation(),
      DB_PREFIX: inputDto.getDatabasePrefix(),
      DB_PORT: inputDto.getDatabasePort(),
      INSTALL_ADMIN_PASS: inputDto.getAdminName(),
      INSTALL_ADMIN_LOGIN: inputDto.getAdminLogin(),
      INSTALL_ADMIN_NAME: inputDto.getAdminPass(),
      INSTALL_ADMIN_EMAIL: inputDto.getAdminEmail(),
      INSTALL_LANGUAGE: inputDto.getLanguage(),
      APP_KEY: appKey
    }
  }

  /**
   * @param {NodeJS.ProcessEnv} environment
   * @returns {Promise<void>}
   */
  async runPhoenixMigrations(environment) {
    const {projectPath, runCommand} = this.context
    await runCommand("./bin/phoenix", ["migrate", "-vvv"], {
      cwd: projectPath,
      env: environment
    })
  }
}
