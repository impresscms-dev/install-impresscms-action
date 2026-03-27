export default class StrategyResultTypeError extends Error {
  /**
   * @param {string} strategyName
   */
  constructor(strategyName) {
    super(`Strategy ${strategyName} must return ResultsDto`)
    this.name = "StrategyResultTypeError"
  }
}
