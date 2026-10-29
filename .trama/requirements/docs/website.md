---
description: "Use when writing or changing the pages of the website's guide or the texts of its landing page."
---
# Website guide

## website
- The guide explains how to use Trama to a developer who has never seen it, in English, in four sections:
  - **Getting started**: the requirements (VS Code, the platforms, omp, `gh` only for Team), installing the extension, the first run of omp, and putting Trama into a project with Get Started, through Import from Code or Start from Scratch.
  - **Concepts**: the System, Features, Machines, States, Transitions, Events and Actors; the Requirements, their Areas and fragments and the skills made from them; the Specs; Proposals, Tasks, Drifts and ghosts; the Board and the History.
  - **Workflows**: design and its rounds of questions, reviewing and approving or rejecting a Proposal, Rework with feedback, Run and Run all, Scan, Drifts and their Fix options, resolving and unifying Drifts, import, Start from Scratch, refining stale Proposals, Solo mode, and Manager mode with Team. The guide does not mention the PR Check while it is hidden (`rules#pr-check`).
  - **Panel & settings**: every view of the panel and the side menu, the Diagram and its focus, omp Chat and General, away notifications, and every setting of the extension with what it does and its default.
- The settings page is generated at build time from the `contributes.configuration` of `extension/package.json` (title, description, type and default of each setting), so it never disagrees with the editor.
- Pages describe what the developer sees and does, never the implementation (components, modules, messages, Requirement references), as the READMEs do.
- The pages of Getting started and Workflows are guides in numbered steps. Each step has a number, a short title, one or two sentences saying what the developer does and what happens, and the annotated screenshot of the real VS Code window that shows it; the notes on the screenshot name the controls the step uses with the words the extension shows. A page has as many steps as the task needs, and no step without its screenshot.
- The pages of Concepts and Panel & settings stay prose, illustrated where it helps by annotated screenshots of the same kind.
- Every screenshot has an `alt` text that says what it shows; the notes on it are real text, read in order after the `alt`.
- When a change alters what a screenshot shows, its scene is updated and the screenshots are generated again (see `tech#website`), in the same change.
- The guide does not copy `docs/cli.md` or `docs/model-format.md`: its Reference links them on GitHub.
- When a change adds or changes behaviour that the guide describes, the guide changes with it.
