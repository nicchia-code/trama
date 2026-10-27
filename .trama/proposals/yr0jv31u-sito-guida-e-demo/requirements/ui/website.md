---
description: "Use when building or changing the website: landing page, guide pages, demo page, tour and scripted agent in omp Chat."
---
# Website

## website
- Every page of the site is in English and shares one header: the Trama logo and name (link to the landing page), Guide, Demo, a link to the GitHub repository, an Install button that opens the extension on the VS Code Marketplace, and the switch between the light and the dark theme.
- The site has its own design, not a documentation theme. It uses the panel's palette (zinc base colour with a blue primary, light and dark, see `ui#General`) so the site and the demo look like one thing. The theme starts from the visitor's system preference; the switch changes every page and the demo at once, and the choice is remembered in the browser for the next pages and visits.
- The landing page holds, in this order: a hero with the name, the tagline and two calls to action, Try the demo and Install; the animated preview of the demo, a loop of the demo at work that opens the demo page when clicked; the loop of Trama in five steps (describe a change, answer the agent's questions, approve the Proposal, run the Tasks, resolve the Drifts), one section per step, each with a short text and the view of the real panel that shows it; the requirements and the install; a footer with links to the guide, the repository, `docs/cli.md`, `docs/model-format.md` and the license.
- The five steps animate as the visitor scrolls: each section enters the screen with its text and its view of the panel sliding and fading in, and the view of the panel shows the step happening (for example a card arriving on the Board). An animation runs once, when its section first enters the screen.
- The guide pages have a sidebar with the four sections (Getting started, Concepts, Workflows, Panel & settings) and their pages, a table of contents of the page, and links to the previous and next page. A Reference group at the end of the sidebar links `docs/cli.md` and `docs/model-format.md` on GitHub, marked as external links.

## demo
- The demo page shows a toolbar above the demo window: Reset, the full screen button (Enter full screen / Exit full screen) and the list of chapters of the tour. The theme switch of the header also changes the demo, and the `Theme` setting in the demo's Settings is tied to it: changing either changes the other.
- The demo window imitates a VS Code window in the current theme: title bar, activity bar, the sidebar with the explorer and Trama's side menu, the editor area with the panel's tab and any opened file, the secondary sidebar with omp Chat, the terminal at the bottom and the status bar with the ghosts. The panel, the side menu and omp Chat are the extension's own views, unchanged.
- The explorer shows two folders, `shop` (the shop with its Trama project) and `shop-code` (the same code without Trama). Choosing `shop-code` makes the panel show Get Started, as opening that folder does in the editor.
- A file the extension would open in an editor (a Model file, a card, a source file, a Task image) opens as a read-only tab in the editor area of the demo window, with line numbers; an image shows as an image. The tab closes with its ×.
- A confirmation or an input of VS Code (for example before deleting a Task or dismissing a Drift) appears as VS Code shows it, a small dialog at the top centre of the demo window, with the same texts as in the editor.
- The demo's minimum width is 1024 CSS pixels. While loading, the demo window shows a loading indicator in its place.
- Too narrow: the demo window is covered by a message that asks to widen the browser window to at least the minimum width.

## demo/Recording
- The page plays the recording of the tour muted and in a loop, with its poster image while it loads, and a line below it that invites to open the site from a computer to try the demo. The landing page and the guide stay usable on any width.

## tour
- A step shows an arrow pointing at its target in the demo window and a bubble next to it, never covering the target. The bubble holds the chapter's name, the step number out of the chapter's steps, one or two short sentences saying what to do and why, and Skip tour. Arrow and bubble follow their target when the window resizes, scrolls or changes view.
- A step that waits for the scripted agent points at omp Chat and says what the agent is doing; it has no target to click.
- After an action off the step the arrow hides and the bubble offers Back to the step and Continue freely.
- The list of chapters, opened from the toolbar, shows the four chapters in order with their steps' progress (done chapters checked, the current one marked), lets the visitor start any chapter and says that starting a chapter puts the demo at its starting point. It also holds Skip tour while the tour guides.
- The closing bubble of the tour thanks the visitor and links the guide and the install of the extension.
- Bubbles and the list of chapters are reachable and usable from the keyboard; the bubble's buttons take the focus when a step opens without stealing it from a field the visitor is typing in.

## scripted-agent
- While a script plays, its conversation in omp Chat shows a Skip to end button above the input field.
- A script shows its messages as the real agent does in omp Chat: text that appears progressively, tool calls with their rows (Trama commands, file reads and edits) and their results. The steps of a script are paced so that the whole script lasts between 3 and 10 seconds.
- The courtesy reply to a message the visitor writes says, in two sentences, that in the demo the agent works only from Trama's buttons and what the tour's next step is (or, with the tour off, which buttons start the agent).
