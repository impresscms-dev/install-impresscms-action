import {existsSync} from "node:fs"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {ContainerBuilder, JsFileLoader} from "node-dependency-injection"
import InputDto from "./DTO/InputDto.js"
import ResultsDto from "./DTO/ResultsDto.js"
import PathNotFoundError from "./Errors/PathNotFoundError.js"
import StrategyResultTypeError from "./Errors/StrategyResultTypeError.js"
import NoSupportedStrategyError from "./Errors/NoSupportedStrategyError.js"

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = path.dirname(currentFilePath)

const run = async () => {
  const container = new ContainerBuilder()
  const loader = new JsFileLoader(container)
  await loader.load(path.join(currentDirPath, "Config", "Container.js"))

  /** @type {import("./Services/ActionsCoreService.js").default} */
  const actionsCore = container.get("service.actions_core")
  try {
    const inputDto = InputDto.fromActionInput(name => actionsCore.getInput(name))
    const projectPath = path.resolve(inputDto.path)
    if (!existsSync(projectPath)) {
      throw new PathNotFoundError(projectPath)
    }
    container.set("app.context", {projectPath})

    for (const taggedService of container.findTaggedServiceIds("strategy")) {
      const strategy = container.get(taggedService.id)
      const supported = await strategy.isSupported(inputDto)
      if (!supported) {
        continue
      }

      const result = await strategy.apply(inputDto)
      if (!(result instanceof ResultsDto)) {
        throw new StrategyResultTypeError(strategy.name)
      }

      result.applyOutputs((name, value) => actionsCore.setOutput(name, value))
      return
    }

    throw new NoSupportedStrategyError()
  } catch (error) {
    actionsCore.setFailed(error.message)
  }
}

void run()
