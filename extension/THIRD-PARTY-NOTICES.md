# Third-party notices

The panel, the omp Chat view and the side menu (the webviews of the extension) are built with the libraries below. Their code is bundled into `dist/webview.js`, `dist/omp-chat.js`, `dist/menu.js` and their stylesheet.

## lucide

Every icon of the panel (the glyphs on the buttons, badges and tabs, and the generic technology icon in the Specs tab) comes from `lucide-react`, as inline SVG with only the icons used bundled.

- Source: https://github.com/lucide-icons/lucide
- License: ISC License, https://github.com/lucide-icons/lucide/blob/main/LICENSE (parts derived from Feather are under the MIT License).
- Copyright: Lucide Icons and Contributors; Cole Bemis (Feather).

## simple-icons

The language and file-type logos of the tool call rows of the omp Chat view (`extension/src/webview/omp-chat/tool-logo.ts`) come from `simple-icons`, with only the logos used bundled. The logos are trademarks of their respective owners, shown only to name the language or file type.

- Source: https://github.com/simple-icons/simple-icons
- License: CC0 1.0 Universal (public domain dedication).
- Copyright: Simple Icons Collaborators.

## shadcn/ui

The panel's components (`extension/src/webview/ui/`) are copied and adapted from shadcn/ui.

- Source: https://github.com/shadcn-ui/ui
- License: MIT License.
- Copyright: shadcn.

## Radix UI

The primitives under the shadcn/ui components (`@radix-ui/react-slot`, `-tabs`, `-dialog`, `-select`, `-checkbox`, `-tooltip`, `-popover`, `-dropdown-menu`).

- Source: https://github.com/radix-ui/primitives
- License: MIT License.
- Copyright: WorkOS.

## Other libraries of the panel

- React and `react-dom` 19: MIT License, Copyright Meta Platforms, Inc. and affiliates. https://github.com/facebook/react
- Tailwind CSS 4 (build time; its generated styles are in the bundle): MIT License, Copyright Tailwind Labs, Inc. https://github.com/tailwindlabs/tailwindcss
- `class-variance-authority`: Apache License 2.0, Copyright Joe Bell. https://github.com/joe-bell/cva
- `clsx`: MIT License, Copyright Luke Edwards. https://github.com/lukeed/clsx
- `tailwind-merge`: MIT License, Copyright Dany Castillo. https://github.com/dcastil/tailwind-merge
- `cmdk`: MIT License, Copyright Paco Coursey. https://github.com/dip/cmdk

## mermaid

The diagrams of ` ```mermaid ` blocks in the panel and in omp Chat are drawn by `mermaid` 12, bundled with its own dependencies in `dist/mermaid.js`, a separate file the first diagram of a page loads on demand (it is not part of `dist/webview.js`, `dist/omp-chat.js` or `dist/menu.js`).

- Source: https://github.com/mermaid-js/mermaid
- License: MIT License, https://github.com/mermaid-js/mermaid/blob/develop/LICENSE
- Copyright: Knut Sveidqvist. The libraries bundled with it keep their own licences, listed in their packages.
