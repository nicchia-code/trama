---
title: "The panel and the side menu"
description: "Every view of the Trama panel, and the side menu that opens them."
order: 1
---

Trama has one **panel**, a tab in the editor area, and a **side menu** in the activity bar that chooses what the panel shows. The panel has its own theme, the same palette as this site: choose **Auto**, **Light** or **Dark** in Settings.

## The side menu

Click the Trama icon in the activity bar. In a Trama project the view is titled with the project's name, `TRAMA: <NAME>`, and has, from the top:

| Entry | What it opens |
| --- | --- |
| **Board** | The Backlog, the Active Tasks and what is Done. A badge counts the cards waiting for a decision. |
| **Diagram** | The Model, drawn. |
| **Requirements** | The Requirements, by Area. |
| **Specs** | The technologies of the project. |
| **History** | The story of the work done. |
| **Team** | With Manager mode on (experimental): the people and the plan of the team. |

After a line, at the bottom: **Merge**, only with Solo mode on; **Scan System**, which scans the whole System (see [Scan the System](/guide/workflows/scan/)); and **Settings**.

```screenshot
scene: board-menu
alt: "Trama's side menu in a Trama project: Board with a badge of 2, Diagram, Requirements, Specs and History at the top, and Scan System and Settings after a line at the bottom, next to the Board in the panel."
```

- In a folder that is not a Trama project the menu offers **Get Started** and **Settings**; with no folder, **Open Folder**.
- The Trama icon in the activity bar carries a badge with the number of cards waiting for a decision, with the tooltip `N cards await a decision`.
- When the view is narrower than 56 px, each entry shows only its icon.
- The palette commands **Trama: Show Board**, **Show Diagram**, **Show Requirements**, **Show Specs**, **Show History** and **Show Settings** do what the entries do.

The panel's tab is titled with the name of the view it shows.

## The views

- **Board**: see [The Board and the History](/guide/concepts/board-and-history/).
- **Diagram**: see [The Diagram and its focus](/guide/panel-and-settings/diagram/).
- **Requirements**: each Area with its description, introduction and fragments, each with its sections. With a Proposal selected, labels show what it changes. See [Requirements and skills](/guide/concepts/requirements-and-skills/).
- **Specs**: the fields of the Specs, with their entries. See [Specs](/guide/concepts/specs/).
- **History**: entries grouped by day, with a period menu. See [The Board and the History](/guide/concepts/board-and-history/).
- **Team**: **Decisions**, **Issues**, **Pull Requests**, **Timeline** and **People** with Manager mode on; with it off, only **Pull Requests**, the PR Check of a pull request, in any project whose origin is on GitHub. See [Manager mode and Team](/guide/workflows/manager-mode/).
- **Settings**: see [Settings](/guide/panel-and-settings/settings/).
- **Get Started**: the setup wizard of a folder that is not yet a project. See [Put Trama in a project](/guide/getting-started/get-started/).

Board, Diagram, Requirements, Specs and History are read-only. What changes in the project passes through the decisions on Proposals and Drifts, and the buttons that start the agent.

## Text in the panel

All prose in the panel is rendered as Markdown: descriptions in the Diagram's details, the body of a Proposal or a Task, the text of a Drift and of every Requirement. Paragraphs, lists, task lists, tables, code blocks and links work; a code block marked `mermaid` is drawn as a diagram. Raw HTML is shown as text, and images are not shown. Links open in the browser only when they are `http` or `https` addresses. When the project's repository is on GitHub, `#123` and `@handle` become links to the issue and the user.

## Tooltips and keyboard

Every button with an icon has a tooltip and an accessible name, and a disabled button gives its reason in its tooltip. Everything is reachable from the keyboard with a visible focus ring. Motion is turned off when the system asks for reduced motion.
