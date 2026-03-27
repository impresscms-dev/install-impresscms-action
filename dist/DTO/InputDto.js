export default class InputDto {
  #data

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
    this.#data = {
      url,
      databaseType,
      databaseHost,
      databaseUser,
      databasePassword,
      databaseName,
      databaseCharset,
      databaseCollation,
      databasePrefix,
      databasePort,
      adminName,
      adminLogin,
      adminPass,
      adminEmail,
      language,
      appKey,
      path
    }
  }

  /**
   * Create input dto from GitHub Action input reader.
   *
   * @param {(name: string) => string} getInput
   * @returns {InputDto}
   */
  static fromActionInput(getInput) {
    /**
     * @param {string} name
     * @param {string} fallback
     * @returns {string}
     */
    const read = (name, fallback) => {
      const value = getInput(name)
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

  /**
   * @returns {string}
   */
  get url() {
    return this.#data.url
  }

  /**
   * @returns {string}
   */
  get databaseType() {
    return this.#data.databaseType
  }

  /**
   * @returns {string}
   */
  get databaseHost() {
    return this.#data.databaseHost
  }

  /**
   * @returns {string}
   */
  get databaseUser() {
    return this.#data.databaseUser
  }

  /**
   * @returns {string}
   */
  get databasePassword() {
    return this.#data.databasePassword
  }

  /**
   * @returns {string}
   */
  get databaseName() {
    return this.#data.databaseName
  }

  /**
   * @returns {string}
   */
  get databaseCharset() {
    return this.#data.databaseCharset
  }

  /**
   * @returns {string}
   */
  get databaseCollation() {
    return this.#data.databaseCollation
  }

  /**
   * @returns {string}
   */
  get databasePrefix() {
    return this.#data.databasePrefix
  }

  /**
   * @returns {string}
   */
  get databasePort() {
    return this.#data.databasePort
  }

  /**
   * @returns {string}
   */
  get adminName() {
    return this.#data.adminName
  }

  /**
   * @returns {string}
   */
  get adminLogin() {
    return this.#data.adminLogin
  }

  /**
   * @returns {string}
   */
  get adminPass() {
    return this.#data.adminPass
  }

  /**
   * @returns {string}
   */
  get adminEmail() {
    return this.#data.adminEmail
  }

  /**
   * @returns {string}
   */
  get language() {
    return this.#data.language
  }

  /**
   * @returns {string}
   */
  get appKey() {
    return this.#data.appKey
  }

  /**
   * @returns {string}
   */
  get path() {
    return this.#data.path
  }
}
