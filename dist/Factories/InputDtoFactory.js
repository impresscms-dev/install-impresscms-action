import InputDto from "../DTO/InputDto.js"

export default class InputDtoFactory {
  /**
   * @param {import("../Services/ActionsCoreService.js").default} actionsCore
   */
  constructor(actionsCore) {
    this.actionsCore = actionsCore
  }

  /**
   * @returns {InputDto}
   */
  create() {
    /**
     * @param {string} name
     * @param {string} fallback
     * @returns {string}
     */
    const read = (name, fallback) => {
      const value = this.actionsCore.getInput(name)
      return value === "" ? fallback : value
    }

    return new InputDto({
      url: read("url", "http://localhost"),
      databaseType: read("database_type", "pdo.mysql"),
      databaseHost: read("database_host", "127.0.0.1"),
      databaseUser: read("database_user", ""),
      databasePassword: read("database_password", ""),
      databaseName: read("database_name", "icms"),
      databaseCharset: read("database_charset", "utf8"),
      databaseCollation: read("database_collation", "utf8_general_ci"),
      databasePrefix: read("database_prefix", "icms"),
      databasePort: read("database_port", "3306"),
      adminName: read("admin_name", "icms"),
      adminLogin: read("admin_login", "icms"),
      adminPass: read("admin_pass", "icms"),
      adminEmail: read("admin_email", "noreply@impresscms.dev"),
      language: read("language", "english"),
      appKey: read("app_key", ""),
      path: read("path", ".")
    })
  }
}
