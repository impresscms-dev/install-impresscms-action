import {existsSync} from "node:fs"
import path from "node:path"
import ResultsDto from "./DTO/ResultsDto.js"
import PathNotFoundError from "./Errors/PathNotFoundError.js"
import StrategyResultTypeError from "./Errors/StrategyResultTypeError.js"
import NoSupportedStrategyError from "./Errors/NoSupportedStrategyError.js"
import buildContainer from "./Config/Container.js"

const run = async () => {
  const container = buildContainer()

  /** @type {import("./Services/ActionsCoreService.js").default} */
  const actionsCore = container.get("service.actions_core")
  /** @type {import("./Factories/InputDtoFactory.js").default} */
  const inputDtoFactory = container.get("factory.input_dto")
  try {
    const inputDto = inputDtoFactory.create()
    const projectPath = path.resolve(inputDto.path)
    if (!existsSync(projectPath)) {
      throw new PathNotFoundError(projectPath)
    }

    for (const taggedService of container.findTaggedServiceIds("strategy")) {
      const strategy = container.get(taggedService.id)
      const supported = await strategy.isSupported(inputDto, projectPath)
      if (!supported) {
        continue
      }

      const result = await strategy.apply(inputDto, projectPath)
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
