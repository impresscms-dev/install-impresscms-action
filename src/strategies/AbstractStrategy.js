export default class AbstractStrategy {
  constructor(context) {
    this.context = context
    this.name = this.constructor.name
  }

  async isSupported() {
    throw new Error(`${this.name}.isSupported() must be implemented`)
  }

  async apply() {
    throw new Error(`${this.name}.apply() must be implemented`)
  }
}
