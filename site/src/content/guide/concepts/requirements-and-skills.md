---
title: "Requirements and skills"
description: "How the System must be built, kept beside the Model, and the skills the agent reads."
order: 2
---

The Model says what the System does. **Requirements** say how it must be built: interface, technology and constraints, quality, data and business rules. They live beside the Model, not in it, and each one is attached to the System, a Feature, a Machine or a State.

## Areas and fragments

Requirements are grouped in **Areas**, each with a sentence that says when an agent needs it. A new project starts with five: `ui` (Interface), `tech`, `quality`, `data` and `rules`. Areas can be added, split or deleted freely.

An Area is divided into small **fragments**, chosen for the project, each with its own sentence saying when an agent needs it, for example the fragment of the checkout screens. A fragment holds **sections**:

- `General`, for what is true of the whole Area or fragment;
- one section for each Model element it concerns, such as a Machine or a State.

A section belongs to its Area, not to the fragment that holds it: moving a section to another fragment does not change it.

## Reading the Requirements

The **Requirements** view of the panel shows each Area with its title, description and introduction, then its fragments, each with its sections. The view is read-only. When a Proposal is selected, the view shows what it changes: `new fragment`, `fragment removed`, and `added`, `removed`, `changed` or `moved from …` on the sections. See [The panel and the side menu](/guide/panel-and-settings/panel/).

```screenshot
scene: requirements-view
alt: "The Requirements view with the Data and Interface Areas, each with its description, an Open file button and its fragment with the sections order, payment, checkout and order/Paid, and the Proposal selector at the top."
```

A Task or Proposal card can open the Requirements that concern it with **View requirements**, which steps through the sections one at a time.

## From Requirements to skills

An agent loads **skills**: short instructions, installed in the project, that it reads when they apply. Trama turns the Requirements into skills so the agent reads yours before it works on the thing they concern. Every fragment with content becomes a skill, and the fragment's sentence tells the agent when to use it. When the fragments' skills would take too much of the list the agent receives, each Area becomes a single index skill that points to its fragments.

Trama also installs its own skills, for design, scan, implement, import and resolving Drifts, and keeps them current: when Trama opens a project after an update, it refreshes the skills it installed. They go in `.agents/skills`, or in the folder set by **Skills Dir**.

Requirements change like the Model: through Proposals you approve. The Requirement skills are regenerated when a Proposal that changes them is approved.
