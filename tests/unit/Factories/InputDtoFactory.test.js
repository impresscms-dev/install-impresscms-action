import InputDtoFactory from "../../../src/Factories/InputDtoFactory.js"
import InputDto from "../../../src/DTO/InputDto.js"

describe("InputDtoFactory", () => {
  test("create maps input values into InputDto", () => {
    const values = {
      url: "http://example.test",
      database_type: "pdo.pgsql",
      database_host: "db.local",
      database_host_in_container: "db-container.local",
      database_user: "user",
      database_password: "pass",
      database_name: "dbname",
      database_charset: "utf8mb4",
      database_collation: "utf8mb4_unicode_ci",
      database_prefix: "myprefix",
      database_port: "5432",
      admin_name: "Admin Name",
      admin_login: "admin",
      admin_pass: "secret",
      admin_email: "admin@example.test",
      language: "french",
      app_key: "app-key",
      path: "./project"
    }
    const actionsCore = {
      getInput: name => values[name] ?? ""
    }

    const factory = new InputDtoFactory(actionsCore)
    const inputDto = factory.create()

    expect(inputDto).toBeInstanceOf(InputDto)
    expect(inputDto.url).toBe("http://example.test")
    expect(inputDto.databaseType).toBe("pdo.pgsql")
    expect(inputDto.databaseHost).toBe("db.local")
    expect(inputDto.databaseHostInContainer).toBe("db-container.local")
    expect(inputDto.databaseUser).toBe("user")
    expect(inputDto.databasePassword).toBe("pass")
    expect(inputDto.databaseName).toBe("dbname")
    expect(inputDto.databaseCharset).toBe("utf8mb4")
    expect(inputDto.databaseCollation).toBe("utf8mb4_unicode_ci")
    expect(inputDto.databasePrefix).toBe("myprefix")
    expect(inputDto.databasePort).toBe("5432")
    expect(inputDto.adminName).toBe("Admin Name")
    expect(inputDto.adminLogin).toBe("admin")
    expect(inputDto.adminPass).toBe("secret")
    expect(inputDto.adminEmail).toBe("admin@example.test")
    expect(inputDto.language).toBe("french")
    expect(inputDto.appKey).toBe("app-key")
    expect(inputDto.path).toBe("./project")
  })

  test("create falls back to defaults for empty inputs", () => {
    const actionsCore = {
      getInput: () => ""
    }

    const factory = new InputDtoFactory(actionsCore)
    const inputDto = factory.create()

    expect(inputDto.url).toBe("http://localhost")
    expect(inputDto.databaseType).toBe("pdo.mysql")
    expect(inputDto.databaseHost).toBe("127.0.0.1")
    expect(inputDto.databaseHostInContainer).toBe("")
    expect(inputDto.databaseName).toBe("icms")
    expect(inputDto.databasePort).toBe("3306")
    expect(inputDto.adminName).toBe("icms")
    expect(inputDto.adminLogin).toBe("icms")
    expect(inputDto.adminPass).toBe("icms")
    expect(inputDto.adminEmail).toBe("noreply@impresscms.dev")
    expect(inputDto.language).toBe("english")
    expect(inputDto.path).toBe(".")
  })
})
