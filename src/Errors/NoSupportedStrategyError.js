export default class NoSupportedStrategyError extends Error {
  constructor() {
    super("No supported strategy was found for this ImpressCMS checkout")
    this.name = "NoSupportedStrategyError"
  }
}
