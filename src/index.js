import {appendFileSync, chmodSync, existsSync, readdirSync, statSync} from "node:fs"
import path from "node:path"
import process from "node:process"
import {spawn} from "node:child_process"

const getInput = (name, fallback = "") => process.env[`INPUT_${name.toUpperCase()}`] ?? fallback

const setOutput = (name, value) => {
  const outputPath = process.env.GITHUB_OUTPUT
  if (!outputPath) {
    return
  }

  appendFileSync(outputPath, `${name}=${String(value)}\n`, {encoding: "utf8"})
}

const runCommand = async (command, args, options = {}) => await new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  })

  let stdout = ""
  let stderr = ""

  child.stdout.on("data", data => {
    const chunk = data.toString()
    stdout += chunk
    process.stdout.write(chunk)
  })

  child.stderr.on("data", data => {
    const chunk = data.toString()
    stderr += chunk
    process.stderr.write(chunk)
  })

  child.on("error", reject)
  child.on("close", code => {
    if (code !== 0) {
      reject(new Error(`Command failed: ${command} ${args.join(" ")}\n${stderr}`))
      return
    }

    resolve({stdout, stderr})
  })
})

const chmodRecursive = (targetPath) => {
  if (!existsSync(targetPath)) {
    return
  }

  try {
    if (process.platform !== "win32") {
      process.stdout.write(`Setting write permissions for ${targetPath}\n`)
      const stats = statSync(targetPath)
      chmodSync(targetPath, 0o777)
      if (stats.isDirectory()) {
        for (const entry of readdirSync(targetPath)) {
          chmodRecursive(path.join(targetPath, entry))
        }
      }
    }
  } catch {
    // Ignore permission errors to preserve old behavior from shell scripts.
  }
}

const run = async () => {
  const projectPath = path.resolve(getInput("path", "."))
  const appKeyInput = getInput("app_key", "")
  const composerFilePath = path.join(projectPath, "composer.json")
  const phoenixPath = path.join(projectPath, "bin", "phoenix")
  const phoenixBatPath = path.join(projectPath, "bin", "phoenix.bat")

  const usesComposer = existsSync(composerFilePath)
  setOutput("uses_composer", usesComposer)

  if (!usesComposer) {
    throw new Error("Currently only ImpressCMS versions that has composer support are supported for this action")
  }

  await runCommand("composer", ["install", "--no-progress", "--prefer-dist", "--optimize-autoloader"], {
    cwd: projectPath,
    env: process.env
  })

  const usesPhoenix = existsSync(phoenixPath) || existsSync(phoenixBatPath)
  setOutput("uses_phoenix", usesPhoenix)

  if (!usesPhoenix) {
    throw new Error("Currently only ImpressCMS versions that has phoenix support are supported for this action")
  }

  let appKey = appKeyInput
  if (!appKeyInput) {
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
  setOutput("app_key", appKey)

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
    chmodRecursive(path.join(projectPath, folderPath))
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
}

run().catch(error => {
  process.stderr.write(`${error.message}\n`)
  process.exitCode = 1
})
