export default class StrategyResultTypeError extends Error {
  constructor(strategyName) {
    super(`Strategy ${strategyName} must return ResultsDto`)
    this.name = "StrategyResultTypeError"
  }
}
