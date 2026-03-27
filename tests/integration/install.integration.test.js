import {mkdtemp, rm} from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import {spawn, spawnSync} from "node:child_process"
import {jest} from "@jest/globals"
import {GenericContainer, Wait} from "testcontainers"
import RequirementsInfo from "../../src/Config/RequirementsInfo.js"
import InputDto from "../../src/DTO/InputDto.js"
import CommandRunnerService from "../../src/Services/CommandRunnerService.js"
import FilePermissionService from "../../src/Services/FilePermissionService.js"
import ImpressVersionService from "../../src/Services/ImpressVersionService.js"
import NetworkService from "../../src/Services/NetworkService.js"
import ApacheContainerFactory from "../../src/Factories/ApacheContainerFactory.js"
import PlaywrightInstallerClientFactory from "../../src/Factories/PlaywrightInstallerClientFactory.js"
import DefaultStrategy from "../../src/strategies/DefaultStrategy.js"
import TngStrategy from "../../src/strategies/TngStrategy.js"

const IMPRESSCMS_REPOSITORY_URL = "https://github.com/ImpressCMS/impresscms.git"
const MYSQL_IMAGE = process.env.INTEGRATION_MYSQL_IMAGE || "mysql:5.7"
const MYSQL_ROOT_PASSWORD = "icms"
const MYSQL_DATABASE = "icms"
const MYSQL_USER = "root"
const MYSQL_PASSWORD = MYSQL_ROOT_PASSWORD
const REQUIREMENTS_VERSIONS = Object.keys(RequirementsInfo).sort()
const RUN_INTEGRATION_TESTS = process.env.RUN_INSTALLATION_INTEGRATION_TESTS === "1"
const HAS_DOCKER = commandExists("docker")
const CAN_RUN = RUN_INTEGRATION_TESTS && HAS_DOCKER
const integrationDescribe = CAN_RUN ? describe : describe.skip

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
 * @returns {Promise<string[]>}
 */
async function fetchImpresscmsTags() {
  const {stdout} = await runCommand("git", ["ls-remote", "--tags", "--refs", IMPRESSCMS_REPOSITORY_URL])
  return stdout
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.split(/\s+/)[1])
    .filter(Boolean)
    .map(ref => ref.replace(/^refs\/tags\//, ""))
}

/**
 * @param {string} tag
 * @returns {{major: number, minor: number, patch: number, stable: boolean, preReleaseRank: number} | null}
 */
function parseTagVersion(tag) {
  const normalized = tag
    .replace(/^impresscms_/, "")
    .replace(/_final$/i, "")
    .replace(/_/g, ".")
    .replace(/^v/i, "")

  const stableMatch = normalized.match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (stableMatch) {
    return {
      major: Number(stableMatch[1]),
      minor: Number(stableMatch[2]),
      patch: Number(stableMatch[3]),
      stable: true,
      preReleaseRank: 999
    }
  }

  const preReleaseMatch = normalized.match(/^(\d+)\.(\d+)\.(\d+)[.-]?(rc|beta|alpha)\.?(\d+)?$/i)
  if (!preReleaseMatch) {
    return null
  }

  const preReleaseType = preReleaseMatch[4].toLowerCase()
  const preReleaseTypeRank = {
    rc: 3,
    beta: 2,
    alpha: 1
  }[preReleaseType]

  return {
    major: Number(preReleaseMatch[1]),
    minor: Number(preReleaseMatch[2]),
    patch: Number(preReleaseMatch[3]),
    stable: false,
    preReleaseRank: (preReleaseTypeRank * 100) + Number(preReleaseMatch[5] || 0)
  }
}

/**
 * @param {string[]} tags
 * @param {string} majorMinor
 * @returns {string | null}
 */
function resolveTagForMajorMinor(tags, majorMinor) {
  const [major, minor] = majorMinor.split(".").map(Number)
  const candidates = tags
    .map(tag => ({tag, parsed: parseTagVersion(tag)}))
    .filter(item => item.parsed && item.parsed.major === major && item.parsed.minor === minor)
    .sort((left, right) => {
      if (left.parsed.patch !== right.parsed.patch) {
        return right.parsed.patch - left.parsed.patch
      }
      if (left.parsed.stable !== right.parsed.stable) {
        return left.parsed.stable ? -1 : 1
      }
      return right.parsed.preReleaseRank - left.parsed.preReleaseRank
    })

  return candidates[0]?.tag ?? null
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
  await runCommand("git", ["clone", "--depth", "1", "--branch", ref, IMPRESSCMS_REPOSITORY_URL, targetPath])
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

  /** @type {string[]} */
  let tags = []
  /** @type {Record<string, string>} */
  let versionTagMap = {}

  beforeAll(async () => {
    tags = await fetchImpresscmsTags()
    versionTagMap = Object.fromEntries(REQUIREMENTS_VERSIONS.map(version => {
      const tag = resolveTagForMajorMinor(tags, version)
      return [version, tag || ""]
    }))
  })

  for (const version of REQUIREMENTS_VERSIONS) {
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

  const tngTest = commandExists("php") && commandExists("composer") ? test : test.skip
  tngTest("installs tng branch", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "icms-install-integration-"))
    const checkoutPath = path.join(tempRoot, "impresscms-tng")
    const mysql = await startMysqlContainer()
    const actionsCore = createActionsCoreStub()

    try {
      await checkoutImpresscmsReference(checkoutPath, "tng")

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
