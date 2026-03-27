export default class TaggedContainer {
  #definitions

  constructor() {
    this.#definitions = []
  }

  /**
   * @param {object} definition
   * @param {string} definition.id
   * @param {() => unknown} definition.factory
   * @param {string[]} [definition.tags]
   * @returns {void}
   */
  register({id, factory, tags = []}) {
    this.#definitions.push({
      id,
      factory,
      tags: new Set(tags)
    })
  }

  /**
   * @param {string} tag
   * @returns {unknown[]}
   */
  resolveByTag(tag) {
    return this.#definitions
      .filter(definition => definition.tags.has(tag))
      .map(definition => definition.factory())
  }
}
