import { expect, test } from "bun:test";
import { GUIDE_SECTIONS, buildGuideNav, neighbours, sectionOf, type GuidePage } from "../site/src/lib/guide";
import { withBase as linkBase } from "../site/src/lib/links";
import { rehypeBase, withBase } from "../site/src/plugins/rehype-base";

const pages: GuidePage[] = [
  { id: "workflows/design", title: "Design", order: 1 },
  { id: "concepts/model", title: "The Model", order: 2 },
  { id: "getting-started/install", title: "Install", order: 2 },
  { id: "getting-started/requirements", title: "Requirements", order: 1 },
  { id: "concepts/board", title: "Board", order: 2 },
  { id: "panel-and-settings/settings", title: "Settings", order: 1 },
];

test("the nav has the four sections in the sidebar's order, with their pages by order and then by title", () => {
  const nav = buildGuideNav(pages);
  expect(nav.map((s) => s.title)).toEqual(["Getting started", "Concepts", "Workflows", "Panel & settings"]);
  expect(nav.map((s) => s.id)).toEqual(GUIDE_SECTIONS.map((s) => s.id));
  expect(nav[0]?.pages.map((p) => p.id)).toEqual(["getting-started/requirements", "getting-started/install"]);
  expect(nav[1]?.pages.map((p) => p.id)).toEqual(["concepts/board", "concepts/model"]);
});

test("a page outside the four section folders fails the build instead of disappearing", () => {
  expect(() => buildGuideNav([{ id: "extras/page", title: "Page", order: 1 }])).toThrow(/extras\/page/);
});

test("previous and next follow the reading order across sections, and stop at the two ends", () => {
  const nav = buildGuideNav(pages);
  expect(neighbours(nav, "getting-started/requirements")).toEqual({ previous: undefined, next: nav[0]?.pages[1] });
  expect(neighbours(nav, "getting-started/install").next?.id).toBe("concepts/board");
  expect(neighbours(nav, "concepts/board").previous?.id).toBe("getting-started/install");
  expect(neighbours(nav, "panel-and-settings/settings").next).toBeUndefined();
  expect(neighbours(nav, "nowhere/page")).toEqual({});
});

test("a page knows its section", () => {
  const nav = buildGuideNav(pages);
  expect(sectionOf(nav, "workflows/design")?.title).toBe("Workflows");
  expect(sectionOf(nav, "nowhere/page")).toBeUndefined();
});

test("addresses inside the site start with the base path", () => {
  expect(linkBase("/trama/", "guide/")).toBe("/trama/guide/");
  expect(linkBase("/trama", "/guide/")).toBe("/trama/guide/");
  expect(linkBase("/trama/", "")).toBe("/trama/");
});

test("the Markdown plugin puts the base path before root-relative links and images only", () => {
  const tree = {
    type: "root",
    children: [
      { type: "element", tagName: "a", properties: { href: "/guide/concepts/model/" }, children: [] },
      { type: "element", tagName: "a", properties: { href: "/trama/guide/" }, children: [] },
      { type: "element", tagName: "a", properties: { href: "https://github.com/nicchia-code/trama" }, children: [] },
      { type: "element", tagName: "a", properties: { href: "#settings" }, children: [] },
      { type: "element", tagName: "a", properties: { href: "//example.com/x" }, children: [] },
      { type: "element", tagName: "p", children: [{ type: "element", tagName: "img", properties: { src: "/docs-images/board.png", alt: "Board" }, children: [] }] },
    ],
  };
  rehypeBase({ base: "/trama/" })(tree);
  const hrefs = tree.children.slice(0, 5).map((n) => n.properties?.href);
  expect(hrefs).toEqual(["/trama/guide/concepts/model/", "/trama/guide/", "https://github.com/nicchia-code/trama", "#settings", "//example.com/x"]);
  expect(tree.children[5]?.children?.[0]?.properties?.src).toBe("/trama/docs-images/board.png");
  expect(withBase("/trama/", undefined)).toBeUndefined();
});
