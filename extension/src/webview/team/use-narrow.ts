import { useEffect, useRef, useState } from "react";

/** Whether the element is narrower than `width`: the part of the Team view that asks lays itself out in a column. Unknown (no observer, or the element hidden) keeps what was. */
export function useNarrow(width: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (element === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const w = entry?.contentRect.width;
      if (w !== undefined && w > 0) setNarrow(w < width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);
  return { ref, narrow };
}
