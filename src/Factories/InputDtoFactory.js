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
    return new InputDto({
      url: this.actionsCore.getInput("url") || "http://localhost",
      databaseType: this.actionsCore.getInput("database_type") || "pdo.mysql",
      databaseHost: this.actionsCore.getInput("database_host") || "127.0.0.1",
      databaseUser: this.actionsCore.getInput("database_user") || "",
      databasePassword: this.actionsCore.getInput("database_password") || "",
      databaseName: this.actionsCore.getInput("database_name") || "icms",
      databaseCharset: this.actionsCore.getInput("database_charset") || "utf8",
      databaseCollation: this.actionsCore.getInput("database_collation") || "utf8_general_ci",
      databasePrefix: this.actionsCore.getInput("database_prefix") || "icms",
      databasePort: this.actionsCore.getInput("database_port") || "3306",
      adminName: this.actionsCore.getInput("admin_name") || "icms",
      adminLogin: this.actionsCore.getInput("admin_login") || "icms",
      adminPass: this.actionsCore.getInput("admin_pass") || "icms",
      adminEmail: this.actionsCore.getInput("admin_email") || "noreply@impresscms.dev",
      language: this.actionsCore.getInput("language") || "english",
      appKey: this.actionsCore.getInput("app_key") || "",
      path: this.actionsCore.getInput("path") || "."
    })
  }
}
