import {spawnSync} from "node:child_process"

export default class CommandExistenceService {
  /**
   * @param {string} command
   * @returns {boolean}
   */
  exists(command) {
    const result = spawnSync(command, ["--version"], {stdio: "ignore"})
    return result.status === 0
  }
}
