import {mkdtemp, rm} from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import {spawn, spawnSync} from "node:child_process"
import {jest} from "@jest/globals"
import {GenericContainer, Wait} from "testcontainers"
import RequirementsInfo from "../../src/Config/RequirementsInfo.js"
import LegacyTagByVersion from "../../src/Config/LegacyTagByVersion.js"
import ImpresscmsRepositoryInfo from "../../src/Config/ImpresscmsRepositoryInfo.js"
import InputDto from "../../src/DTO/InputDto.js"
import CommandRunnerService from "../../src/Services/CommandRunnerService.js"
import FilePermissionService from "../../src/Services/FilePermissionService.js"
import ImpressVersionService from "../../src/Services/ImpressVersionService.js"
import NetworkService from "../../src/Services/NetworkService.js"
import ApacheContainerFactory from "../../src/Factories/ApacheContainerFactory.js"
import PlaywrightInstallerClientFactory from "../../src/Factories/PlaywrightInstallerClientFactory.js"
import DefaultStrategy from "../../src/strategies/DefaultStrategy.js"
import TngStrategy from "../../src/strategies/TngStrategy.js"

const MYSQL_IMAGE = process.env.INTEGRATION_MYSQL_IMAGE || "mariadb:10.6"
const MYSQL_ROOT_PASSWORD = "icms"
const MYSQL_DATABASE = "icms"
const MYSQL_USER = "root"
const MYSQL_PASSWORD = MYSQL_ROOT_PASSWORD
const REQUIREMENTS_VERSIONS = Object.keys(RequirementsInfo).sort()
const INTEGRATION_VARIANT = process.env.INTEGRATION_VARIANT || "all"
const INTEGRATION_IMPRESSCMS_REF = process.env.INTEGRATION_IMPRESSCMS_REF || ""
const HAS_DOCKER = commandExists("docker")
const integrationDescribe = HAS_DOCKER ? describe : describe.skip
const selectedLegacyVersions = INTEGRATION_VARIANT === "all"
  ? REQUIREMENTS_VERSIONS
  : (LegacyTagByVersion[INTEGRATION_VARIANT] ? [INTEGRATION_VARIANT] : [])
const runTngVariant = INTEGRATION_VARIANT === "all" || INTEGRATION_VARIANT === "tng"

/**
 * @param {string} command
 * @returns {boolean}
 */
function commandExists(command) {
  const result = spawnSync(command, ["--version"], {stdio: "ignore"})
  return result.status === 0
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{cwd?: string, env?: NodeJS.ProcessEnv}} [options]
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
function runCommand(command, args, {cwd = process.cwd(), env = process.env} = {}) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    })

    let stdout = ""
    let stderr = ""
    childProcess.stdout.on("data", chunk => {
      stdout += String(chunk)
    })
    childProcess.stderr.on("data", chunk => {
      stderr += String(chunk)
    })
    childProcess.on("error", reject)
    childProcess.on("close", code => {
      if (code === 0) {
        resolve({stdout, stderr})
        return
      }

      reject(new Error(`Command failed (${command} ${args.join(" ")}), exit code ${code}, stderr: ${stderr}`))
    })
  })
}

/**
 * @returns {{info: Function, warning: Function, error: Function}}
 */
function createActionsCoreStub() {
  return {
    info: () => {},
    warning: () => {},
    error: () => {}
  }
}

/**
 * @param {string} majorMinor
 * @param {string} databaseHost
 * @param {number} databasePort
 * @returns {InputDto}
 */
function createInputDto(majorMinor, databaseHost, databasePort) {
  return new InputDto({
    url: "http://localhost",
    databaseType: "pdo.mysql",
    databaseHost,
    databaseUser: MYSQL_USER,
    databasePassword: MYSQL_PASSWORD,
    databaseName: MYSQL_DATABASE,
    databaseCharset: "utf8",
    databaseCollation: "utf8_general_ci",
    databasePrefix: `icms_${majorMinor.replace(".", "_")}`,
    databasePort: String(databasePort),
    adminName: "Administrator",
    adminLogin: "admin",
    adminPass: "admin123456",
    adminEmail: "admin@example.test",
    language: "english",
    appKey: ""
  })
}

/**
 * @param {string} targetPath
 * @param {string} ref
 * @returns {Promise<void>}
 */
async function checkoutImpresscmsReference(targetPath, ref) {
  await runCommand("git", ["clone", "--depth", "1", "--branch", ref, ImpresscmsRepositoryInfo.url, targetPath])
}

/**
 * @returns {Promise<import("testcontainers").StartedTestContainer>}
 */
async function startMysqlContainer() {
  return await new GenericContainer(MYSQL_IMAGE)
    .withExposedPorts(3306)
    .withEnvironment({
      MYSQL_ROOT_PASSWORD,
      MYSQL_DATABASE
    })
    .withWaitStrategy(Wait.forLogMessage(/ready for connections/i, 2))
    .withStartupTimeout(240000)
    .start()
}

integrationDescribe("Installation Integration", () => {
  jest.setTimeout(1_800_000)

  /** @type {Record<string, string>} */
  let versionTagMap = {}

  beforeAll(() => {
    if (INTEGRATION_VARIANT !== "all" && selectedLegacyVersions.length === 0 && !runTngVariant) {
      throw new Error(`Unknown integration variant: ${INTEGRATION_VARIANT}`)
    }

    versionTagMap = Object.fromEntries(selectedLegacyVersions.map(version => {
      if (INTEGRATION_IMPRESSCMS_REF) {
        return [version, INTEGRATION_IMPRESSCMS_REF]
      }

      return [version, LegacyTagByVersion[version] || ""]
    }))
  })

  for (const version of selectedLegacyVersions) {
    test(`installs legacy version line ${version}`, async () => {
      const targetTag = versionTagMap[version]
      expect(targetTag).toBeTruthy()

      const tempRoot = await mkdtemp(path.join(os.tmpdir(), "icms-install-integration-"))
      const checkoutPath = path.join(tempRoot, `impresscms-${version.replace(".", "_")}`)
      const mysql = await startMysqlContainer()
      const actionsCore = createActionsCoreStub()

      try {
        await checkoutImpresscmsReference(checkoutPath, targetTag)

        const strategy = new DefaultStrategy(
          new NetworkService(actionsCore),
          new FilePermissionService(actionsCore),
          new ImpressVersionService(actionsCore),
          new ApacheContainerFactory(),
          new PlaywrightInstallerClientFactory(),
          {uploadFailureArtifacts: async () => {}}
        )
        const inputDto = createInputDto(version, mysql.getHost(), mysql.getMappedPort(3306))

        const isSupported = await strategy.isSupported(inputDto, checkoutPath)
        expect(isSupported).toBe(true)

        const result = await strategy.apply(inputDto, checkoutPath)
        expect(result.usesComposer).toBe(false)
        expect(result.usesPhoenix).toBe(false)
        expect(result.detectedImpresscmsVersion).toMatch(/^\d+\.\d+\.\d+$/)
      } finally {
        await mysql.stop()
        await rm(tempRoot, {recursive: true, force: true})
      }
    })
  }

  const tngTest = runTngVariant && commandExists("php") && commandExists("composer") ? test : test.skip
  tngTest("installs tng branch", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "icms-install-integration-"))
    const checkoutPath = path.join(tempRoot, "impresscms-tng")
    const mysql = await startMysqlContainer()
    const actionsCore = createActionsCoreStub()
    const tngRef = INTEGRATION_IMPRESSCMS_REF || "TNG"

    try {
      await checkoutImpresscmsReference(checkoutPath, tngRef)

      const strategy = new TngStrategy(
        new FilePermissionService(actionsCore),
        new CommandRunnerService(actionsCore),
        new ImpressVersionService(actionsCore)
      )
      const inputDto = createInputDto("2.0", mysql.getHost(), mysql.getMappedPort(3306))

      const isSupported = await strategy.isSupported(inputDto, checkoutPath)
      expect(isSupported).toBe(true)

      const result = await strategy.apply(inputDto, checkoutPath)
      expect(result.usesComposer).toBe(true)
      expect(result.usesPhoenix).toBe(true)
      expect(result.detectedImpresscmsVersion).toMatch(/^\d+\.\d+\.\d+$/)
    } finally {
      await mysql.stop()
      await rm(tempRoot, {recursive: true, force: true})
    }
  })
})
