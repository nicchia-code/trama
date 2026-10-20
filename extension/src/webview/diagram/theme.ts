/**
 * Colours the canvas needs as plain `rgb()` strings. Cytoscape cannot read CSS variables, so the canvas takes the panel's theme
 * (the shadcn/ui zinc light or dark one, chosen by the class `dark` on the root) as the same zinc and Tailwind colours the
 * components use: the 600 shade in the light theme and the 400 shade in the dark one.
 */
export interface Palette {
  fg: string;
  bg: string;
  node: string;
  line: string;
  muted: string;
  blue: string;
  red: string;
  purple: string;
  focus: string;
  /** The colour of the elements of a focus: Tailwind cyan, the 600 shade in the light theme and the 400 shade in the dark one. */
  cyan: string;
  font: string;
}

type Rgba = [number, number, number, number];

const hex = (value: string): string => {
  const n = Number.parseInt(value.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

const LIGHT = { fg: hex("#09090b"), bg: hex("#ffffff"), node: hex("#f4f4f5"), blue: hex("#2563eb"), red: hex("#dc2626"), purple: hex("#9333ea"), focus: hex("#2563eb"), cyan: hex("#0891b2") };
const DARK = { fg: hex("#fafafa"), bg: hex("#09090b"), node: hex("#18181b"), blue: hex("#60a5fa"), red: hex("#f87171"), purple: hex("#c084fc"), focus: hex("#3b82f6"), cyan: hex("#22d3ee") };

function parse(color: string): Rgba {
  const nums = (/\(([^)]+)\)/.exec(color)?.[1] ?? "0 0 0").split(/[\s,/]+/).filter(Boolean).map(Number);
  return [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0, nums[3] ?? 1];
}

/** `t` of `a` over `b`, as an `rgba()` string. */
export function mix(a: string, b: string, t: number): string {
  const x = parse(a);
  const y = parse(b);
  const [r, g, bl, al] = x.map((v, i) => v * t + (y[i] as number) * (1 - t)) as Rgba;
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(bl)}, ${al})`;
}

/** The colours of the panel's current theme, read from the class `dark` of the document root. */
export function readPalette(root: HTMLElement = document.documentElement): Palette {
  const base = root.ownerDocument.documentElement.classList.contains("dark") ? DARK : LIGHT;
  return {
    ...base,
    line: mix(base.fg, base.bg, 0.55),
    muted: mix(base.fg, base.bg, 0.6),
    font: getComputedStyle(root).fontFamily,
  };
}
