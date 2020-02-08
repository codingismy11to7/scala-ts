import { lazily } from "../src/Lazy";

describe("Lazy", () => {
  it("only creates an item once", () => {
    const mockFn = jest.fn(() => {});
    const lazyInt = lazily(() => {
      mockFn();
      return 42;
    });

    expect(lazyInt()).toBe(42);
    expect(lazyInt()).toBe(42);
    expect(lazyInt()).toBe(42);
    expect(mockFn.mock.calls.length).toBe(1);
  });
});
