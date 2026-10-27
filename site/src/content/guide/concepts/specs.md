---
title: "Specs"
description: "The technologies the project uses, in one place the agent reads."
order: 3
---

The **Specs** list the technologies the project is built with, so the agent picks the same ones instead of guessing. They are kept in one file, `.trama/specs.yaml`, in fields that always appear in the same order:

- **Languages**
- **Frameworks**: frameworks and libraries that shape the code
- **Testing**
- **CI**
- **Deployment**
- **Infrastructure**
- **Notes**: free text, for constraints written down nowhere else

Each entry has a name, optionally a version, and a short note. An entry the agent chose itself, because the Specs did not say, is marked with a **chosen by agent** badge that gives the reason, so you can see what it decided and change it.

## Reading the Specs

The **Specs** view of the panel shows the fields one under the other, with the entries of each field side by side. The view is read-only. With a Proposal selected, entries it adds, changes or removes are marked in colour, as in the Diagram. A chip that points at the Specs, on a Task or in a Drift, opens this view on that entry.

```screenshot
scene: specs-view
alt: "The Specs view with its fields one under the other: Languages with TypeScript 7, Frameworks and libraries with Bun 1.4, Data and persistence, Testing, Deployment and Infrastructure as code, each entry with a short note."
```

## Changing the Specs

Like the Model, the Specs change through Proposals. The first import of an existing project writes the Specs from what the repository declares (manifests, lockfiles, test and CI configuration, Dockerfiles). A new technology enters the project through a Proposal you approve; see [Review, approve or reject a Proposal](/guide/workflows/review-proposals/).
