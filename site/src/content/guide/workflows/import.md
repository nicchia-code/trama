---
title: "Import from code"
description: "Describe an existing project as a Model, as it is, through Proposals."
order: 8
---

**Import** is for a project that already has its code. An agent describes it, as it is, through Proposals for the Model and its evident Requirements. It does not judge or correct the code: what the documentation contradicts, or what the code seems to get wrong, is recorded as a **doubt** for you to read.

```step
title: Choose Import from Code
text: |
  In the **Path** step of the setup wizard, choose **Import from Code** and press **Next**; in a project whose Model is empty, the **Import from Code** button of the Diagram does the same (see [Put Trama in a project](/guide/getting-started/get-started/)).
scene: wizard-path-import
alt: "The Path step of the Set up Trama wizard with the Import from Code card chosen, the Start from Scratch card not chosen, and the Next button enabled at the bottom right."
eager: true
```

```step
title: Leave out what the agent should not read
text: |
  The **Folders** step lists the folders of the project. Uncheck the ones the agent should not import, such as vendored code or build output.
scene: wizard-folders
alt: "The Folders step of the wizard listing src and README.md with checked boxes under the line Everything is included, and Back and Next at the bottom."
```

```step
title: Confirm and start
text: |
  The **Summary** shows `Import from Code` in the **Path** card. Press **Set up Trama**: the agent starts reading the code with the **Analysis** model.
scene: wizard-summary
alt: "The Summary step of the wizard with the Path card reading Import from Code, the omp and Models cards below, and the Set up Trama button at the bottom right."
```

```step
title: Follow the import
text: |
  An **Import** conversation opens in omp Chat, and the status bar shows `Importing from code` while the agent works.
scene: import-started
alt: "The empty Board of the new project with an Import conversation open in omp Chat, where the agent says the repository is an online shop in TypeScript, and Importing from code in the status bar."
```

```step
title: Review the Proposals
text: |
  The import arrives as several Proposals, one after the other. The first, **Import: System and Actors**, describes the System and its Actors and writes the **Specs** from what the repository declares; then one Proposal for each Feature, with its Machines and States and the Requirements that are evident from the code.
scene: board-proposal
alt: "The Board with an open Proposal card in the Backlog, with the files it adds and the buttons View on diagram, View requirements, Approve and Reject, as each import Proposal looks."
```

Read each Proposal as any other (see [Review, approve or reject a Proposal](/guide/workflows/review-proposals/)) and open its `## Doubts`. Approve those that are right, and **Rework with feedback…** those that miss the point. Approving an import Proposal changes the Model files only; the code is not touched.

## After the import

The Diagram now draws the System. Design the next change from the Board: [Design a change](/guide/workflows/design/). A [scan](/guide/workflows/scan/) compares the new Model with the code whenever you want to know where they differ.
