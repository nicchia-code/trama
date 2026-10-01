/** Colours the canvas needs as plain `rgb()` strings, resolved from the `--dg-*` custom properties in diagram.css. */
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
  font: string;
}

type Rgba = [number, number, number, number];

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

export function readPalette(root: HTMLElement): Palette {
  const probe = document.createElement("span");
  probe.style.display = "none";
  root.append(probe);
  const color = (name: string) => {
    probe.style.color = `var(${name})`;
    return getComputedStyle(probe).color;
  };
  const fg = color("--dg-fg");
  const bg = color("--dg-bg");
  const palette: Palette = {
    fg,
    bg,
    node: color("--dg-node"),
    line: mix(fg, bg, 0.55),
    muted: mix(fg, bg, 0.6),
    blue: color("--dg-blue"),
    red: color("--dg-red"),
    purple: color("--dg-purple"),
    focus: color("--dg-focus"),
    font: getComputedStyle(root).fontFamily,
  };
  probe.remove();
  return palette;
}
