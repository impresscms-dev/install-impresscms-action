import {mkdtemp} from "node:fs/promises"
import {tmpdir} from "node:os"
import path from "node:path"
import {DefaultArtifactClient} from "@actions/artifact"

export default class PlaywrightArtifactsService {
  /**
   * @param {import("./ActionsCoreService.js").default} actionsCore
   */
  constructor(actionsCore) {
    this.actionsCore = actionsCore
    this.artifactClient = new DefaultArtifactClient()
  }

  /**
   * @param {import("../Infrastructure/PlaywrightInstallerClientInstance.js").default} playwrightInstallerClient
   * @returns {Promise<void>}
   */
  async uploadFailureArtifacts(playwrightInstallerClient) {
    try {
      const artifactsDirectory = await mkdtemp(path.join(tmpdir(), "install-impresscms-playwright-"))
      const {files, rootDirectory} = await playwrightInstallerClient.captureFailureArtifacts(artifactsDirectory)
      if (files.length === 0) {
        this.actionsCore.warning("No Playwright debug artifacts were generated for upload.")
        return
      }

      const artifactName = this.createArtifactName()
      const uploadResponse = await this.artifactClient.uploadArtifact(artifactName, files, rootDirectory)
      this.actionsCore.info(`Uploaded Playwright debug artifacts as ${artifactName} (${uploadResponse.size} bytes).`)
    } catch (error) {
      this.actionsCore.warning(`Unable to upload Playwright debug artifacts: ${this.normalizeErrorMessage(error)}`)
    }
  }

  /**
   * @returns {string}
   */
  createArtifactName() {
    const runId = process.env.GITHUB_RUN_ID ?? "local"
    const runAttempt = process.env.GITHUB_RUN_ATTEMPT ?? "1"
    return `install-impresscms-playwright-debug-${runId}-${runAttempt}-${Date.now()}`
  }

  /**
   * @param {unknown} error
   * @returns {string}
   */
  normalizeErrorMessage(error) {
    if (error instanceof Error) {
      return error.message
    }

    return String(error)
  }
}
