import {context} from "@actions/github"

export default class GitHubContextService {
  /**
   * @returns {string}
   */
  get runId() {
    if (context.runId) {
      return String(context.runId)
    }

    return "local"
  }

  /**
   * @returns {string}
   */
  get runAttempt() {
    if (context.runAttempt) {
      return String(context.runAttempt)
    }

    return "1"
  }
}
