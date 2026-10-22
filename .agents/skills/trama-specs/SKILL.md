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
- VS Code extension API ^1.95.0: the extension host runs in Node, bundled as CommonJS
- React 19: the panel webview, with `react-dom`
- shadcn/ui: components copied into the webview source, zinc base colour with a blue primary, light and dark
- Radix UI: the primitives under the shadcn/ui components
- Tailwind CSS 4: compiled at build time into one stylesheet of the webview
- class-variance-authority (chosen by the agent: used by the shadcn/ui components for their variants)
- clsx (chosen by the agent: used by the shadcn/ui components to join class names)
- tailwind-merge (chosen by the agent: used by the shadcn/ui components to merge Tailwind classes)
- lucide-react: the icons of the panel, as inline SVG components
- cmdk: the Command list under the shadcn/ui Combobox of the model fields
- cytoscape: draws the Diagram on a canvas, hosted in a React component
- elkjs: lays out the Diagram
- yaml: front matter and settings files
- zod 4: input schemas of the command line
- fantasticon: development dependency, used only by `scripts/icon-font.ts` (chosen by the agent: turns the logo SVG into the one-glyph icon font of the status bar button, in a single step)

## Testing

- bun test: the whole suite, also with `--isolate`
- happy-dom: the DOM of the webview component tests
- Testing Library: `@testing-library/react`, interactions as the user does them

## CI

- GitHub Actions: tagged releases on Bun 1.4.0, one `.vsix` per platform

## Deployment

- VS Code Marketplace package: one `.vsix` per platform (`linux-x64`, `darwin-arm64`, `win32-x64`), with the `trama` binary inside
