import ActionsCoreService from "../Services/ActionsCoreService.js"
import GitHubContextService from "../Services/GitHubContextService.js"
import InputDtoFactory from "../Factories/InputDtoFactory.js"
import FilePermissionService from "../Services/FilePermissionService.js"
import CommandRunnerService from "../Services/CommandRunnerService.js"
import NetworkService from "../Services/NetworkService.js"
import ImpressVersionService from "../Services/ImpressVersionService.js"
import PlaywrightArtifactsService from "../Services/PlaywrightArtifactsService.js"
import ApacheContainerFactory from "../Factories/ApacheContainerFactory.js"
import PlaywrightInstallerClientFactory from "../Factories/PlaywrightInstallerClientFactory.js"
import TngStrategy from "../strategies/TngStrategy.js"
import DefaultStrategy from "../strategies/DefaultStrategy.js"

export const services = {
  "service.actions_core": {
    class: ActionsCoreService
  },
  "service.github_context": {
    class: GitHubContextService
  },
  "factory.input_dto": {
    class: InputDtoFactory,
    arguments: [
      "@service.actions_core"
    ]
  },
  "service.file_permission": {
    class: FilePermissionService,
    arguments: [
      "@service.actions_core"
    ]
  },
  "service.command_runner": {
    class: CommandRunnerService,
    arguments: [
      "@service.actions_core"
    ]
  },
  "service.network": {
    class: NetworkService,
    arguments: [
      "@service.actions_core"
    ]
  },
  "service.impress_version": {
    class: ImpressVersionService,
    arguments: [
      "@service.actions_core"
    ]
  },
  "service.playwright_artifacts": {
    class: PlaywrightArtifactsService,
    arguments: [
      "@service.actions_core",
      "@service.github_context"
    ]
  },
  "factory.apache_container": {
    class: ApacheContainerFactory
  },
  "factory.playwright_installer_client": {
    class: PlaywrightInstallerClientFactory
  },
  "strategy.tng": {
    class: TngStrategy,
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
    class: DefaultStrategy,
    arguments: [
      "@service.network",
      "@service.file_permission",
      "@service.impress_version",
      "@factory.apache_container",
      "@factory.playwright_installer_client",
      "@service.playwright_artifacts"
    ],
    tags: [
      {name: "strategy"}
    ]
  }
}
