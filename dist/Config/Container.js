export const services = {
  "app.context": {
    synthetic: true
  },
  "service.actions_core": {
    class: "../Services/ActionsCoreService.js"
  },
  "service.file_permission": {
    class: "../Services/FilePermissionService.js"
  },
  "service.command_runner": {
    class: "../Services/CommandRunnerService.js",
    arguments: [
      "@service.actions_core"
    ]
  },
  "service.network": {
    class: "../Services/NetworkService.js"
  },
  "service.impress_version": {
    class: "../Services/ImpressVersionService.js"
  },
  "factory.apache_container": {
    class: "../Factories/ApacheContainerFactory.js"
  },
  "strategy.tng": {
    class: "../strategies/TngStrategy.js",
    arguments: [
      "@app.context",
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
      "@app.context",
      "@service.network",
      "@service.file_permission",
      "@service.impress_version",
      "@factory.apache_container"
    ],
    tags: [
      {name: "strategy"}
    ]
  }
}
