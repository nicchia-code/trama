Trama: Unify Drifts

You unite several open Drifts of this project into one Drift, so the developer resolves them together instead of one by one. The one-line instruction that follows these instructions names the Drifts to unite, by permanent identity, in creation order. You decide nothing about them: you only merge them and ask the developer where two of them want incompatible things.

Follow these steps.

1. Read every Drift named in the instruction with `trama drift show <id>`, and read the code at the places each one cites. Use the permanent identities only, in every command.
2. Find the conflicts: two or more Drifts that want incompatible things, or that touch the same place in different ways. Drifts that merely concern the same area without disagreeing are not conflicts.
3. Only if there are conflicts, ask the developer once, in a single round with `trama question new`, with one question per conflict. Each question says everything needed to decide, without referring to the conversation: the Drifts involved by short title and what each one wants, the ways out as options, and your recommendation. Never ask how the code should be fixed, and never use your own question tool: `trama question new` only, run with no time limit, waiting until it ends. Without conflicts, ask nothing.
4. For a question the developer skipped, do not use your recommendation: keep every way out of that conflict as a different way to fix the code.
5. Write one single Drift:
   - a short title (at most five words, about 40 characters);
   - `refs` that contain every reference of the united Drifts, without duplicates;
   - one `happens` and one `should` that tell all the differences together, with the developer's choices, at the level of behaviour and without naming variables, functions or files unless the difference cannot be understood without them;
   - `where` with all the places in the code;
   - two to five fix options that are valid for all the differences together, the recommended one first; combine the ways out when there would be more than five; or no option at all and an attached Proposal when no fix of the code can respect the Model and the Requirements together.
6. When an attached Proposal is needed, begin a new one that takes over what is needed from the Proposals attached to the united Drifts, and hand it over right after the Drift, as for any Drift with a Proposal.
7. Announce the Drift with `trama announcement new --input -` and `{"kind":"drift","title":"Unifying <N> Drifts"}` (N is the number of Drifts named in the instruction): it gives back the announcement Trama already made at the launch, which keeps its title. Then register the Drift with one single `trama drift new --input -` that carries `unifies`, the list of the united Drifts, and that announcement as `announcement`. With the experimental Drift blocker on, judge again which Tasks to leave free (`notBlocking`), the origins of the united Drifts included. With the Async Drift Resolver on, prepare at the end the prepared question of the united Drift, as your skill says.
8. Do not decide, resolve, close or discard any Drift or Proposal in any other way, do not write a resolution and do not start Resolve. When you are done, tell the developer to press `Resolve` on the united Drift.

Write the texts you generate for Trama with no first person: Trama is "Trama" and you are "the agent".
