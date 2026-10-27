---
description: "Use when building or deploying the website in site/, the browser demo host, its scripts, the tour data or the recording script."
---
# Website

## website
- The site lives in `site/`: an Astro project with static output, base path `/trama/`, served at `https://nicchia-code.github.io/trama/`. Its dependencies are in the root `package.json`, so the demo and the extension's webviews share one copy of React and of every library; the root scripts `site:dev` and `site:build` run it with Bun. The build output (`site/dist/`) is not committed.
- The landing page and the guide are Astro pages and components; the guide pages are Markdown files in `site/src/content/guide/`, one folder per section. The animated preview and the demo are React islands, the demo loaded only by the demo page.
- The animations of the landing page use CSS transitions and keyframes started by an `IntersectionObserver` that adds a class to each section when it first enters the screen; no animation library.
- `.github/workflows/pages.yml` builds the site with Bun 1.4.0 and publishes it with `actions/upload-pages-artifact` and `actions/deploy-pages`, with `pages: write` and `id-token: write` permissions and one concurrency group that cancels nothing in progress. It runs on every push to `main` that touches `site/`, `extension/src/`, `src/core/`, `examples/shop/`, `package.json`, `bun.lock` or the workflow itself, and by hand (`workflow_dispatch`). The repository's Pages source is GitHub Actions.
- `tsc --noEmit` covers `site/` too, so a change of the extension's protocol that the demo host does not follow fails the type check and the site build.

## demo
- The demo runs Trama's real `src/core` in the browser. The demo bundle is built with `Bun.build` (`target: "browser"`) and aliases the Node modules the core imports: `node:fs` and `node:fs/promises` to memfs; `node:path` to a stand-in with `posix`, `win32` and `delimiter`; `node:crypto` to a stand-in with a synchronous `createHash("sha256")` on `@noble/hashes`, `randomUUID`, `randomInt` and `randomBytes`; `node:child_process` to a stand-in whose `spawn`, `spawnSync` and `execFile` fail at once, so every git call answers "not in git"; `node:os`, `node:net`, `node:url` and `node:string_decoder` to minimal stand-ins; and a global `process` with `env`, `pid` and `platform`.
- The two folders are mounted in memfs at `/demo/shop` and `/demo/shop-code`. Their seed is generated at build time from `examples/shop` into one module of paths and contents (images in base64); Reset and every chapter's starting point rebuild memfs from it.
- A demo host replaces `extension/src/host`. It re-implements the controller's dispatch of `ToHost`, `ToMenuHost` and `ToChatHost` on the in-memory project, calling the same core functions the controller calls, and reuses the host modules free of VS Code: `messages`, `refinement`, `run-all-estimate`, `drift-resolution`, `proposal-models`, `question-session`, `question-state`, `settings-schema`, `menu/model` (`MenuModel` with a demo surface) and `omp-chat/view-model` (`ChatViewModel` with a demo `OmpSessionPort` that replays scripted ACP `SessionNotification`s). After every change of the project it posts a picture with the full shape `postPicture` gives (snapshot, resolve, unify, models, refinement, runEstimate), without `githubRepo`.
- The panel, the side menu and omp Chat are the extension's own bundles (`webview.js`, `menu.js`, `omp-chat.js`, with `mermaid.js` on demand), built by `scripts/build-extension.ts`, each in an `iframe` of the demo window with its own `acquireVsCodeApi` that relays messages to the demo host. The `vscode-light`/`vscode-dark` class on each frame's `body` follows the site's theme.
- What only VS Code gives is answered by the demo host: settings from `settingsSchema(extension/package.json)` with their defaults, held in memory; Cursor API key and ntfy token saved or removed as a flag; the test notification reported as sent; omp installed and logged in, with a fixed list of model suggestions; Solo mode unavailable, and Manager mode unavailable with the reason "No origin remote"; the folder tree of the wizard read from memfs; files opened in the demo window's editor area; links opened in a new browser tab; modal confirmations and inputs shown by the demo window.
- The Manager-only messages (handoffs, issues, people, the GitHub Project, Manager mode) are never sent, because Team is not available; the demo host ignores them.
- `examples/shop/` holds, besides `.trama/`, a small TypeScript code base of the shop in `src/` (cart, checkout, order, payment and the Actors' adapters), readable in a few minutes, that implements the shop's Model with one difference, the one the scan of the tour's Scan and Drifts chapter finds. It has no discount codes, which the tour's design adds.
- Its `.trama/` holds a History with the work that built the shop so far, approved Proposals and Tasks in Done, so that the History and the closed cards of the demo are not empty. It holds no open Proposal, Task in To do or Drift: those come from the tour.
- The folder `shop-code` of the demo is the seed of `examples/shop` without `.trama/`.

## scripted-agent
- A script is data in `site/src/demo/scripts/`: a list of steps, each a delay and one action: a chat update (ACP `SessionNotification`: message chunk, tool call, tool call update), a ghost note, a question round, or a call of a core function the real agent reaches through the command line (`announce`, `newProposal`, `editInProposal`, `submitProposal`, `newTask`, `moveTask`, `newDrift`, history entries and the like). The tour's scripts are named by chapter and step; the generic scripts by kind of job and take the card they act on.
- Skip to end applies the remaining steps at once, up to the next question round.
- Every script is checked by a test that plays it at no speed on a fresh seed and asserts the project validates (`trama model check` rules) after it.

## tour
- The tour is data in `site/src/demo/tour.ts`: chapters, each with its steps; a step has its target (a `data-tour` attribute of an element of the demo window or of an extension view), its bubble text, and the condition that follows it: a `ToHost`/`ToMenuHost`/`ToChatHost` message with its arguments, a demo window action, or the end of a named script.
- Any other message or window action while a step waits is an action off the step.
- A chapter's starting point is the seed with the earlier chapters' scripts and the visitor's steps of those chapters applied at no speed, computed when the chapter is chosen.
- The extension's views gain stable `data-tour` attributes on the elements the tour points at; they change nothing else in the extension.

## demo/Recording
- `scripts/record-demo.ts` (root script `site:record`) builds the site, serves it locally, drives the tour with Playwright at 1280×800 following every step, and writes `site/public/demo/recording.mp4` (H.264) and `site/public/demo/recording-poster.png`. It is run by hand when the demo changes and its outputs are committed; the video stays under 10 MB.
