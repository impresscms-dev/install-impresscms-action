export const services = {
  "service.actions_core": {
    class: "../Services/ActionsCoreService.js"
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
  "service.playwright_installer_client": {
    class: "../Services/PlaywrightInstallerClientService.js"
  },
  "factory.apache_container": {
    class: "../Factories/ApacheContainerFactory.js"
  },
  "strategy.tng": {
    class: "../strategies/TngStrategy.js",
    arguments: [
      "@service.file_permission",
      "@service.command_runner"
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
      "@service.playwright_installer_client"
    ],
    tags: [
      {name: "strategy"}
    ]
  }
}
