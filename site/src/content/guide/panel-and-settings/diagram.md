---
title: "The Diagram and its focus"
description: "Draw the Model at any zoom level, with a Proposal on top, and step through what a card touches."
order: 2
---

The **Diagram** draws the Model. It is read-only: to change the Model, design a change (see [Design a change](/guide/workflows/design/)).

```screenshot
scene: diagram-machine
alt: "The Diagram at the Machine level with the breadcrumb System, checkout, order, the States and Transitions of the order Machine, the Legend at the bottom left and the details of the selected State Shipped in the side panel."
```

## Levels

The Diagram starts at the **System** level and zooms in step by step. Double-click a node, or press the ↗ handle on it, to open it.

- **System**: nodes without arrows: **Whole System**, the Actors, and the Features that no Actor reaches. An Actor's subtitle says how many Features receive its Events.
- **Whole System**: every Actor and Feature, with arrows that give the number of Events between them.
- **Actor**: that Actor, the Features that receive its Events and the Events between them.
- **Feature**: its Machines and the Events between them.
- **Machine**: its States and Transitions. A State with sub-States can be expanded in place, and opened to see its sub-States.

```screenshot
scene: diagram-system
alt: "The Diagram at the System level with the Whole System node and the Actors User, Courier, Stripe and Warehouse, the Proposal selector and the zoom buttons at the top right, and the System Shop described in the side panel."
```

The **breadcrumb** at the top, such as `System › checkout › order`, goes back to any level; a Feature opened from an Actor or from Whole System remembers where it came from. **Fit** fits the view to the level, and the plus and minus buttons zoom.

## Details

Hovering a node or an arrow shows its title and the first sentence of its description. A click selects it and shows its details in the side panel: the description, the Events, the Transitions with their conditions, and the Requirements that apply. With nothing selected, the panel describes the System.

A **legend** explains the colours: States that a Proposal adds, removes or changes, Drifts, initial and final States.

## Drawing a Proposal

The **Proposal** selector at the top draws an open Proposal over the current Model. New and changed elements are blue, removed ones red and dashed, and the side panel lists the changes and the Tasks of the Proposal, with **Approve** and **Reject**.

```screenshot
scene: review-diagram
alt: "The Diagram drawing Proposal P1: the User Actor is drawn in blue, a bar at the top shows the step 1 of 2 with the Previous and Next buttons and the Clear button, and the side panel lists what changes and the text of the Proposal."
```

## Drifts

An open Drift is drawn as a red node attached to the element it points at, with a Drift that points at nothing in the Model floating on the root. Selecting it shows its two sides, **What happens** and **What should happen**, and **Points at**, with **Dismiss Drift** to close it.

## Focus

The **View on diagram** button on a Proposal or Task card, and every chip on a Task, a Drift or a History entry, opens the Diagram **focused** on the elements that card touches. A bar under the toolbar tells what the focus is of (`Proposal P3 – <title>`), the name of the current step, a counter `2 of 5`, and:

- **Previous** and **Next**, to go step by step: each step moves the view to its elements, and every other element fades to 30% but stays clickable;
- `<M> not found`, when some references no longer resolve, with the list in its tooltip;
- **Only these**, to show only the elements of the focus;
- **Clear**, or **Escape**, to leave the focus.

```screenshot
scene: diagram-focus
alt: "The Diagram focused on Task T1, Returns after shipping: the State Shipped is highlighted and every other State and Transition is faded, with a bar at the top naming the Task and the Clear button."
```

The elements of the focus get a cyan outline; those a Proposal changes keep their blue or red. The same focus works in Requirements and Specs, where **View requirements** or a chip scrolls to the section, Area or field and marks it.

An empty Model shows `The Model is empty. Import the existing code or start from scratch; later, design changes from the Board.` with **Import from Code** and **Start from Scratch**.
