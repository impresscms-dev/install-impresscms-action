import TaggedContainer from "../../src/Infrastructure/TaggedContainer.js"

describe("TaggedContainer", () => {
  test("resolves entries only for requested tag", () => {
    const container = new TaggedContainer()
    container.register({
      id: "a",
      tags: ["strategy"],
      factory: () => "tng"
    })
    container.register({
      id: "b",
      tags: ["other"],
      factory: () => "other"
    })

    expect(container.resolveByTag("strategy")).toEqual(["tng"])
  })

  test("keeps registration order for same tag", () => {
    const container = new TaggedContainer()
    container.register({
      id: "a",
      tags: ["strategy"],
      factory: () => "first"
    })
    container.register({
      id: "b",
      tags: ["strategy"],
      factory: () => "second"
    })

    expect(container.resolveByTag("strategy")).toEqual(["first", "second"])
  })
})
