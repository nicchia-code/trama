import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { logoOf, SpecIcon } from "../extension/src/webview/specs/icons";
import { LOGOS } from "../extension/src/webview/specs/logos";

afterEach(cleanup);

describe("Specs logos", () => {
  test("a logo is found by title or slug, ignoring case and punctuation", () => {
    const [title, slug, path] = LOGOS.find(([, s]) => s === "nextdotjs") ?? [];
    expect(title).toBe("Next.js");
    expect(logoOf("Next.js")).toBe(path ?? "");
    expect(logoOf("nextjs")).toBe(path ?? "");
    expect(logoOf("NEXT JS")).toBe(path ?? "");
    expect(slug).toBe("nextdotjs");
  });

  test("a name with no logo gets null, so the generic icon is drawn", () => {
    expect(logoOf("No Such Technology")).toBeNull();
  });

  test("every built-in logo is a 24x24 path string", () => {
    for (const [title, slug, path] of LOGOS) {
      expect(title.length).toBeGreaterThan(0);
      expect(slug).toMatch(/^[a-z0-9]+$/);
      expect(path.length).toBeGreaterThan(0);
    }
  });

  test("the panel needs no simple-icons runtime dependency", () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dir, "..", "package.json"), "utf8")) as Record<string, Record<string, string> | undefined>;
    expect(pkg.dependencies?.["simple-icons"]).toBeUndefined();
    expect(pkg.devDependencies?.["simple-icons"]).toBeUndefined();
    expect(readFileSync(join(import.meta.dir, "..", "extension", "src", "webview", "specs", "icons.tsx"), "utf8")).not.toContain("simple-icons");
  });

  test("a name with a logo draws it in the current colour, and one with none draws the Package icon", () => {
    const { container } = render(<><SpecIcon name="Next.js" /><SpecIcon name="No Such Technology" /></>);
    const [logo, generic] = Array.from(container.querySelectorAll("svg"));
    expect(logo?.querySelector("path")?.getAttribute("fill")).toBe("currentColor");
    expect(logo?.getAttribute("aria-hidden")).toBe("true");
    expect(generic?.classList.contains("lucide-package")).toBe(true);
  });
});
