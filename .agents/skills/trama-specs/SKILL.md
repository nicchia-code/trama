---
name: trama-specs
description: Use when choosing, adding or using the project's languages, frameworks, libraries, data stores, tests, CI, repository, deployment, cloud resources or infrastructure as code.
---
# Project specs

The technologies this project is built, tested and released with, from the developer's Specs. An entry marked as chosen by the agent was picked by the agent itself, not named by the developer.

## Languages

- TypeScript 7: strict mode, ES2022, ES modules, `noUncheckedIndexedAccess`; type-checked with `tsc --noEmit`

## Frameworks and libraries

- Bun 1.4: runtime, package manager, test runner and compiler of the `trama` binary
- VS Code extension API ^1.106.0: the extension host runs in Node, bundled as CommonJS
- React 19: the panel webview, with `react-dom`
- shadcn/ui: components copied into the webview source, zinc base colour with a blue primary, light and dark
- Radix UI: the primitives under the shadcn/ui components
- Tailwind CSS 4: compiled at build time into one stylesheet of the webview
- class-variance-authority (chosen by the agent: used by the shadcn/ui components for their variants)
- clsx (chosen by the agent: used by the shadcn/ui components to join class names)
- tailwind-merge (chosen by the agent: used by the shadcn/ui components to merge Tailwind classes)
- lucide-react: the icons of the panel, as inline SVG components
- simple-icons: the language and file-type logos of omp Chat's tool rows, CC0; only the icons used are imported, as inline SVG paths
- cmdk: the Command list under the shadcn/ui Combobox of the model fields
- cytoscape: draws the Diagram on a canvas, hosted in a React component
- elkjs: lays out the Diagram
- mermaid 12: draws the `mermaid` blocks of the panel's Markdown, from its own bundle loaded on demand (chosen by the agent: the reference renderer of `mermaid` blocks, the one GitHub uses for issues)
- yaml: front matter and settings files
- zod 4: input schemas of the command line
- Agent Client Protocol SDK: `@agentclientprotocol/sdk`, the client side of ACP that omp Chat uses to talk to `omp acp`, bundled into the extension host
- Astro: the documentation site in `site/`, without Starlight; static output for GitHub Pages
- Rough.js: draws the hand-drawn arrows, circles and underlines of the guide's annotated screenshots as SVG at build time, with a fixed seed
- Playwright: only in the script that takes the guide's screenshots: drives the real VS Code through its Electron process; not part of the tests (chosen by the agent: drives an Electron application and its webviews and takes window screenshots)
- @vscode/test-electron: downloads the pinned version of VS Code that the screenshot script launches, independent of the developer's own VS Code (chosen by the agent: the official way to download and launch a given VS Code build with an extension under development)

## Testing

- bun test: the whole suite, also with `--isolate`
- happy-dom: the DOM of the webview component tests
- Testing Library: `@testing-library/react`, interactions as the user does them

## CI

- GitHub Actions: tagged releases on Bun 1.4.0, one `.vsix` per platform; a second workflow builds and publishes the site to GitHub Pages on every push to `main` that touches the site or the settings of the extension; it never takes screenshots

## Deployment

- VS Code Marketplace package: one `.vsix` per platform (`linux-x64`, `darwin-arm64`, `win32-x64`), with the `trama` binary inside
- GitHub Pages: the documentation site at `https://nicchia-code.github.io/trama/`, published by the GitHub Actions workflow with `actions/deploy-pages`

## Infrastructure as code

- omp: the only coding agent Trama runs and the only source of model names; required, installed with its official installer (`https://omp.sh/install`, `install.ps1` on Windows) when missing and updated with `omp update` before Trama launches it
- GitHub CLI: `gh`, needed only with Manager mode: Trama runs it only to read the GitHub Project, the agent runs it to publish issues; installed and logged in by the Manager, never by Trama
