import {ContainerBuilder, Reference} from "node-dependency-injection"
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

/**
 * @returns {ContainerBuilder}
 */
export default function buildContainer() {
  const container = new ContainerBuilder()

  container.register("service.actions_core", ActionsCoreService)
  container.register("service.github_context", GitHubContextService)

  container
    .register("factory.input_dto", InputDtoFactory)
    .addArgument(new Reference("service.actions_core"))

  container
    .register("service.file_permission", FilePermissionService)
    .addArgument(new Reference("service.actions_core"))

  container
    .register("service.command_runner", CommandRunnerService)
    .addArgument(new Reference("service.actions_core"))

  container
    .register("service.network", NetworkService)
    .addArgument(new Reference("service.actions_core"))

  container
    .register("service.impress_version", ImpressVersionService)
    .addArgument(new Reference("service.actions_core"))

  container
    .register("service.playwright_artifacts", PlaywrightArtifactsService)
    .addArgument(new Reference("service.actions_core"))
    .addArgument(new Reference("service.github_context"))

  container.register("factory.apache_container", ApacheContainerFactory)
  container.register("factory.playwright_installer_client", PlaywrightInstallerClientFactory)

  container
    .register("strategy.tng", TngStrategy)
    .addArgument(new Reference("service.file_permission"))
    .addArgument(new Reference("service.command_runner"))
    .addArgument(new Reference("service.impress_version"))
    .addTag("strategy")

  container
    .register("strategy.default", DefaultStrategy)
    .addArgument(new Reference("service.network"))
    .addArgument(new Reference("service.file_permission"))
    .addArgument(new Reference("service.impress_version"))
    .addArgument(new Reference("factory.apache_container"))
    .addArgument(new Reference("factory.playwright_installer_client"))
    .addArgument(new Reference("service.playwright_artifacts"))
    .addTag("strategy")

  return container
}
