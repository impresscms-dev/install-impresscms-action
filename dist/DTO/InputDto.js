export default class InputDto {
  /**
   * @param {object} [params]
   * @param {string} [params.url]
   * @param {string} [params.databaseType]
   * @param {string} [params.databaseHost]
   * @param {string} [params.databaseUser]
   * @param {string} [params.databasePassword]
   * @param {string} [params.databaseName]
   * @param {string} [params.databaseCharset]
   * @param {string} [params.databaseCollation]
   * @param {string} [params.databasePrefix]
   * @param {string} [params.databasePort]
   * @param {string} [params.adminName]
   * @param {string} [params.adminLogin]
   * @param {string} [params.adminPass]
   * @param {string} [params.adminEmail]
   * @param {string} [params.language]
   * @param {string} [params.appKey]
   * @param {string} [params.path]
   */
  constructor({
    url = "http://localhost",
    databaseType = "pdo.mysql",
    databaseHost = "127.0.0.1",
    databaseUser = "",
    databasePassword = "",
    databaseName = "icms",
    databaseCharset = "utf8",
    databaseCollation = "utf8_general_ci",
    databasePrefix = "icms",
    databasePort = "3306",
    adminName = "icms",
    adminLogin = "icms",
    adminPass = "icms",
    adminEmail = "noreply@impresscms.dev",
    language = "english",
    appKey = "",
    path = "."
  } = {}) {
    this.url = url
    this.databaseType = databaseType
    this.databaseHost = databaseHost
    this.databaseUser = databaseUser
    this.databasePassword = databasePassword
    this.databaseName = databaseName
    this.databaseCharset = databaseCharset
    this.databaseCollation = databaseCollation
    this.databasePrefix = databasePrefix
    this.databasePort = databasePort
    this.adminName = adminName
    this.adminLogin = adminLogin
    this.adminPass = adminPass
    this.adminEmail = adminEmail
    this.language = language
    this.appKey = appKey
    this.path = path
  }

  /**
   * Create input dto from GitHub Action input reader.
   *
   * @param {(name: string, fallback?: string) => string} getInput
   * @returns {InputDto}
   */
  static fromActionInput(getInput) {
    return new InputDto({
      url: getInput("url", "http://localhost"),
      databaseType: getInput("database_type", "pdo.mysql"),
      databaseHost: getInput("database_host", "127.0.0.1"),
      databaseUser: getInput("database_user", ""),
      databasePassword: getInput("database_password", ""),
      databaseName: getInput("database_name", "icms"),
      databaseCharset: getInput("database_charset", "utf8"),
      databaseCollation: getInput("database_collation", "utf8_general_ci"),
      databasePrefix: getInput("database_prefix", "icms"),
      databasePort: getInput("database_port", "3306"),
      adminName: getInput("admin_name", "icms"),
      adminLogin: getInput("admin_login", "icms"),
      adminPass: getInput("admin_pass", "icms"),
      adminEmail: getInput("admin_email", "noreply@impresscms.dev"),
      language: getInput("language", "english"),
      appKey: getInput("app_key", ""),
      path: getInput("path", ".")
    })
  }
}
