# Requirements: Tecnologia e vincoli, Website

Use when building or deploying the website in site/, its annotated screenshots or the script that takes them.

## website

- The site lives in `site/`: an Astro project with static output, base path `/trama/`, served at `https://nicchia-code.github.io/trama/`. Its dependencies are in the root `package.json`; the root scripts `site:dev` and `site:build` run it with Bun. The build output (`site/dist/`) is not committed. The site does not bundle the extension's views or Trama's core.
- The landing page and the guide are Astro pages and components; the guide pages are Markdown files in `site/src/content/guide/`, one folder per section. A step and an annotated screenshot are Astro components used from the Markdown pages; an annotated screenshot is named by its scene.
- The animations of the landing page use CSS transitions and keyframes started by an `IntersectionObserver` that adds a class to each section when it first enters the screen; no animation library.
- Each screenshot has two images, `site/public/screenshots/<scene>.light.png` and `<scene>.dark.png`, and one file of annotations, `site/src/content/screenshots/<scene>.json`: the marks (arrow, ellipse, rectangle, underline) with their points as percentages of the image, and the notes with their text, their position and the mark they belong to. Both images of a scene show the same layout, so one file of annotations serves both.
- Marks are generated at build time with Rough.js into inline SVG over the image, with a fixed seed per scene, so their strokes do not change between builds and the page loads no Rough.js. The draw-in animation runs on the SVG strokes with CSS (`stroke-dasharray`/`stroke-dashoffset`), started by the same `IntersectionObserver`. Notes are HTML text over the image, not part of the SVG. The enlarged view is a native `<dialog>`.
- Excalifont is served by the site as a `woff2` file in `site/public/fonts/`, with its OFL licence beside it.
- `scripts/screenshots.ts` (root script `site:screenshots`) takes every screenshot of the guide, in both themes, without anything by hand:
  - it builds the extension and the `trama` binary, downloads a pinned version of VS Code with `@vscode/test-electron`, and launches it through Playwright's Electron support with the extension under development, an empty user profile, a window of 1440×900 and the editor's Light Modern or Dark Modern theme with Trama's `Theme` setting to match;
  - the scenes are data in `scripts/screenshots/scenes.ts`: for each, how to prepare a fresh copy of `examples/shop` with `trama` commands (Proposals, Tasks, Drifts, question rounds, ghosts), the clicks and keys in VS Code and inside the extension's webviews that bring the window to the state to show, and the area of the window to keep;
  - a stand-in `omp` executable, first on the `PATH` of the launched VS Code, answers the extension's version and login checks and, as `omp acp`, replays a recorded ACP conversation for the scenes that show omp Chat;
  - it writes the two images of every scene and fails, naming the scene, when a step of a scene does not find what it waits for;
  - it is run by hand when the extension's interface changes, and the images are committed.
- `.github/workflows/pages.yml` builds the site with Bun 1.4.0 and publishes it with `actions/upload-pages-artifact` and `actions/deploy-pages`, with `pages: write` and `id-token: write` permissions and one concurrency group that cancels nothing in progress. It runs on every push to `main` that touches `site/`, `docs/images/`, `extension/package.json` (the settings page), `package.json`, `bun.lock` or the workflow itself, and by hand (`workflow_dispatch`). It never takes screenshots. The repository's Pages source is GitHub Actions.
- `tsc --noEmit` covers `site/` and `scripts/screenshots/`.
- The site build fails when a page names a scene without its two images or its file of annotations, or when a file of annotations has a point outside the image.
