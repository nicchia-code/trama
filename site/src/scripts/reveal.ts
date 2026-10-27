/** The class that starts an element's animation. */
export const IN_VIEW = "in-view";

/**
 * Adds the class `in-view` to each element the first time it enters the screen, and stops watching it, so an animation
 * runs once. The animations themselves are CSS transitions and keyframes under that class. Without
 * `IntersectionObserver` every element gets the class at once, which shows the final state.
 */
export function revealOnScroll(elements: Iterable<Element>, observerClass: typeof IntersectionObserver | null = globalThis.IntersectionObserver ?? null): void {
  const list = [...elements];
  if (!observerClass) {
    for (const element of list) element.classList.add(IN_VIEW);
    return;
  }
  const observer = new observerClass(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add(IN_VIEW);
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0, rootMargin: "0px 0px -15% 0px" },
  );
  for (const element of list) observer.observe(element);
}
