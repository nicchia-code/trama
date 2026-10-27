import { expect, test } from "bun:test";
import { IN_VIEW, revealOnScroll } from "../site/src/scripts/reveal";

/** An `IntersectionObserver` the test drives by hand. */
class FakeObserver {
  static last: FakeObserver;
  watched = new Set<Element>();
  constructor(private callback: (entries: Pick<IntersectionObserverEntry, "isIntersecting" | "target">[]) => void) {
    FakeObserver.last = this;
  }
  observe(element: Element) {
    this.watched.add(element);
  }
  unobserve(element: Element) {
    this.watched.delete(element);
  }
  show(element: Element, isIntersecting = true) {
    this.callback([{ isIntersecting, target: element }]);
  }
}
const Observer = FakeObserver as unknown as typeof IntersectionObserver;

test("a section gets the class the first time it enters the screen, and is not watched any more", () => {
  const a = document.createElement("section");
  const b = document.createElement("section");
  revealOnScroll([a, b], Observer);
  const observer = FakeObserver.last;
  expect([...observer.watched]).toEqual([a, b]);

  observer.show(a, false);
  expect(a.classList.contains(IN_VIEW)).toBe(false);
  observer.show(a);
  expect(a.classList.contains(IN_VIEW)).toBe(true);
  expect(b.classList.contains(IN_VIEW)).toBe(false);
  expect([...observer.watched]).toEqual([b]);
});

test("without IntersectionObserver every section shows its final state at once", () => {
  const a = document.createElement("section");
  const b = document.createElement("section");
  revealOnScroll([a, b], null);
  expect(a.classList.contains(IN_VIEW) && b.classList.contains(IN_VIEW)).toBe(true);
});
