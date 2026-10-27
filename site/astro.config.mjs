import { fileURLToPath } from "node:url";
import { unified } from "@astrojs/markdown-remark";
import { defineConfig } from "astro/config";
import { rehypeBase } from "./src/plugins/rehype-base.ts";
import { remarkScreenshots } from "./src/plugins/remark-screenshots.ts";

const base = "/trama/";
const root = fileURLToPath(new URL(".", import.meta.url));

// Static output for GitHub Pages at https://nicchia-code.github.io/trama/. No syntax highlighter: code blocks are plain
// text styled by the site, so they keep their contrast in both themes. The pages are written with HTML whitespace rules
// (a line break between inline elements is a space), hence `compressHTML: true`.
export default defineConfig({
  site: "https://nicchia-code.github.io",
  base,
  output: "static",
  trailingSlash: "always",
  compressHTML: true,
  // The components of the screenshots read the scenes' files at build time, from the site's folder.
  vite: { define: { __SITE_ROOT__: JSON.stringify(root) } },
  markdown: {
    syntaxHighlight: false,
    // The unified pipeline: a plugin that turns the `step` and `screenshot` blocks of a page into steps and annotated
    // screenshots, and one that puts the base path before the root-relative links of the guide.
    processor: unified({ remarkPlugins: [[remarkScreenshots, { base, root }]], rehypePlugins: [[rehypeBase, { base }]] }),
  },
});
