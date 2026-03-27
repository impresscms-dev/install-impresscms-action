import {context} from "@actions/github"

export default class GitHubContextService {
  /**
   * @returns {string}
   */
  getRunId() {
    if (context.runId) {
      return String(context.runId)
    }

    return "local"
  }

  /**
   * @returns {string}
   */
  getRunAttempt() {
    if (context.runAttempt) {
      return String(context.runAttempt)
    }

    return "1"
  }
}
