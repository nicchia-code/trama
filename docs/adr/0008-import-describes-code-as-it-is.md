---
status: accepted
---
# Import describes the code as it is, through Proposals that can require each other

Adopting Trama on an existing codebase needs a Model of what the code already does. The `trama-import` skill writes it: it reads the code, asks the developer one round of questions (what to import, how to split it into Features), then writes Proposals marked `kind: import`. The Model describes the code **as it is**, bugs included. Where the documentation says one thing and the code does another, or the code looks wrong, the Proposal records a doubt with its location instead of correcting it; the developer fixes the Model afterwards through ordinary design. On a project that already has a Model, import only adds what is missing and never edits existing Machines: contradicting code is the Scan's job. It imports only Requirements the code states reliably (technology, data, explicit business rules), never interface or quality goals.

A whole codebase is too large to review as one Proposal, but per-Feature Proposals depend on each other (Actors, Events of other Features). So a Proposal can list `requires`: it is written, diffed and validated on top of the open Proposals it requires, and can be approved only after them. A rejected requirement leaves the dependent Proposal open and blocked, with the reason shown, rather than rejecting it in cascade. `requires` is available to every Proposal, so design can split large changes the same way. Approving an import Proposal starts no Scan, since the Model it adds already matches the code.

## Considered Options

- **Model the intended behaviour, asking about every oddity.** Cleaner Model at once, but a long interview, and the first Scan would immediately produce Tasks and Drifts for every place where intention and code differ.
- **Contradictions between documentation and code as Drifts.** More visible on the board, but a Drift means code differing from the Model, and here the Model is the code.
- **One Proposal per import, or ordered Proposals without dependencies.** One is unreviewable on a real codebase; without `requires`, later Proposals show as invalid until earlier ones are approved.
- **Import inside the Scan.** One button fewer, but it mixes describing the code with judging it and makes the Scan slow and unpredictable.
