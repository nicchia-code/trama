---
status: accepted
---
# Requirements live beside the Model and reach agents as generated skills

The Model says what the System does; developers also need to say how it must be built: the interface, the technology, quality goals, the data each thing holds, business rules. These go in `.trama/requirements/<area>.md`, one file per **Area**, not in the Model. Each file has a `## General` section and sections titled with a Model reference (`## order/Paid`), so a Requirement is attached to the element it concerns and to everything inside it. Requirements follow the Model's rules of change: an agent changes them only through a Proposal (the same one as the behaviour they belong to), the developer may edit them directly, and validation treats a section naming a missing element as an error, so a Proposal that removes a State must also fix the Requirements attached to it.

Agents get Requirements two ways. Trama generates one `trama-req-<area>` skill per Area into the project's skill folders, with the Area's `description` as the skill's, so any agent loads the right Area when it does that kind of work; and `task show`, `drift show` and the Feature, Machine and State views quote the sections attached to the elements in play. The generated skills are committed and regenerated after every approval, by `trama skills update`, and by the extension when an Area file changes; they are never edited by hand.

## Considered Options

- **Requirements inside the Model files** (a `## Requirements` section per Machine). Everything in one place, but the Model stops being only behaviour, and the Diagram, diffs and validation would mix the two.
- **Free documents without references.** Simplest, but neither agents nor the Diagram would know what each one is about, and nothing would catch a Requirement left behind by a renamed State.
- **The skill as the source file.** No generation step, but Model references in a skill's front matter are outside the skill standard and Proposals would have to write into `.agents/`.
- **Delivery only through references, or only through skills.** References alone put General Requirements into every Task whether relevant or not; skills alone leave a State's Requirement to the agent's choice of what to load.
