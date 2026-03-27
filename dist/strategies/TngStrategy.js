import {existsSync} from "node:fs"
import path from "node:path"
import process from "node:process"
import AbstractStrategy from "./AbstractStrategy.js"
import ResultsDto from "../DTO/ResultsDto.js"
import FilePermissionService from "../Services/FilePermissionService.js"

export default class TngStrategy extends AbstractStrategy {
  async isSupported() {
    const {projectPath} = this.context
    const hasComposer = existsSync(path.join(projectPath, "composer.json"))
    const hasPhoenix = existsSync(path.join(projectPath, "bin", "phoenix")) || existsSync(path.join(projectPath, "bin", "phoenix.bat"))
    return hasComposer && hasPhoenix
  }

  async apply() {
    const {projectPath, getInput, runCommand} = this.context

    await runCommand("composer", ["install", "--no-progress", "--prefer-dist", "--optimize-autoloader"], {
      cwd: projectPath,
      env: process.env
    })

    let appKey = getInput("app_key", "")
    if (!appKey) {
      try {
        const result = await runCommand("php", ["./bin/console", "generate:app:key"], {
          cwd: projectPath,
          env: process.env
        })
        appKey = result.stdout.trim().split(/\r?\n/).filter(Boolean).at(-1) ?? ""
      } catch {
        appKey = ""
      }
    }

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

    const env = {
      ...process.env,
      URL: getInput("url", "http://localhost"),
      DB_TYPE: getInput("database_type", "pdo.mysql"),
      DB_HOST: getInput("database_host", "127.0.0.1"),
      DB_USER: getInput("database_user", ""),
      DB_PASS: getInput("database_password", ""),
      DB_PCONNECT: "0",
      DB_NAME: getInput("database_name", "icms"),
      DB_CHARSET: getInput("database_charset", "utf8"),
      DB_COLLATION: getInput("database_collation", "utf8_general_ci"),
      DB_PREFIX: getInput("database_prefix", "icms"),
      DB_PORT: getInput("database_port", "3306"),
      INSTALL_ADMIN_PASS: getInput("admin_name", "icms"),
      INSTALL_ADMIN_LOGIN: getInput("admin_login", "icms"),
      INSTALL_ADMIN_NAME: getInput("admin_pass", "icms"),
      INSTALL_ADMIN_EMAIL: getInput("admin_email", "noreply@impresscms.dev"),
      INSTALL_LANGUAGE: getInput("language", "english"),
      APP_KEY: appKey
    }

    await runCommand("./bin/phoenix", ["migrate", "-vvv"], {
      cwd: projectPath,
      env
    })

    return new ResultsDto({
      appKey,
      usesComposer: true,
      usesPhoenix: true
    })
  }
}
