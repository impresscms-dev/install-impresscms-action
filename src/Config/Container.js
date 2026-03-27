export const services = {
  "service.actions_core": {
    class: "../Services/ActionsCoreService.js"
  },
  "factory.input_dto": {
    class: "../Factories/InputDtoFactory.js",
    arguments: [
      "@service.actions_core"
    ]
  },
  "service.file_permission": {
    class: "../Services/FilePermissionService.js",
    arguments: [
      "@service.actions_core"
    ]
  },
  "service.command_runner": {
    class: "../Services/CommandRunnerService.js",
    arguments: [
      "@service.actions_core"
    ]
  },
  "service.network": {
    class: "../Services/NetworkService.js",
    arguments: [
      "@service.actions_core"
    ]
  },
  "service.impress_version": {
    class: "../Services/ImpressVersionService.js",
    arguments: [
      "@service.actions_core"
    ]
  },
  "factory.apache_container": {
    class: "../Factories/ApacheContainerFactory.js"
  },
  "factory.playwright_installer_client": {
    class: "../Factories/PlaywrightInstallerClientFactory.js"
  },
  "strategy.tng": {
    class: "../strategies/TngStrategy.js",
    arguments: [
      "@service.file_permission",
      "@service.command_runner",
      "@service.impress_version"
    ],
    tags: [
      {name: "strategy"}
    ]
  },
  "strategy.default": {
    class: "../strategies/DefaultStrategy.js",
    arguments: [
      "@service.network",
      "@service.file_permission",
      "@service.impress_version",
      "@factory.apache_container",
      "@factory.playwright_installer_client"
    ],
    tags: [
      {name: "strategy"}
    ]
  }
}
