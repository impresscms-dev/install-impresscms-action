import {existsSync} from "node:fs"
import path from "node:path"
import {fileURLToPath} from "node:url"
import * as core from "@actions/core"
import {ContainerBuilder, JsFileLoader} from "node-dependency-injection"
import InputDto from "./DTO/InputDto.js"
import ResultsDto from "./DTO/ResultsDto.js"
import PathNotFoundError from "./Errors/PathNotFoundError.js"
import StrategyResultTypeError from "./Errors/StrategyResultTypeError.js"
import NoSupportedStrategyError from "./Errors/NoSupportedStrategyError.js"

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = path.dirname(currentFilePath)

const run = async () => {
  const inputDto = InputDto.fromActionInput(core.getInput)
  const projectPath = path.resolve(inputDto.path)
  if (!existsSync(projectPath)) {
    throw new PathNotFoundError(projectPath)
  }

  const context = {
    projectPath
  }

  const container = new ContainerBuilder()
  const loader = new JsFileLoader(container)
  await loader.load(path.join(currentDirPath, "Config", "Container.js"))
  container.set("app.context", context)

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

    result.applyOutputs(core.setOutput)
    return
  }

  throw new NoSupportedStrategyError()
}

run().catch(error => {
  core.setFailed(error.message)
})
