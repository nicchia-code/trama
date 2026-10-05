# Drift

A difference the agent found between the code and the Model, or between the code and a Requirement, that the developer must decide on. By default the code is fixed; the agent attaches a Proposal only when the code handles an important case the Model forgot.

Un Drift nuovo nasce con un'identità propria, non presa da un contatore condiviso con gli altri, e ricorda l'istante in cui è stato creato. Quell'istante ne fissa il posto: il più vecchio prima. Due Drift creati nello stesso istante si ordinano per identità. Un Drift già numerato, che non ricorda l'istante, resta leggibile e sta prima di quelli che lo ricordano; fra i numerati l'ordine è il numero.

Finché è aperto, un Drift ha anche un numero breve temporaneo, `D3`, che il developer usa per leggere la Board e per citarlo, al posto dell'identità permanente. Il Drift lo prende appena la copia di lavoro lo vede e lo libera quando è risolto, in qualunque modo; da quel momento si mostra con la sua identità permanente.

A Drift is created Open by the agent and always points to at least one Model element or Requirement. A Drift the agent files while implementing a Task remembers that Task, its origin.

A Drift always states two sides: what happens (what the code does) and what should happen (what the Model or the Requirement says). The developer always decides by keeping one of the two sides: keeping what should happen has the code fixed; keeping what happens means the Model is left to match the code, through the attached Proposal when there is one and by changing nothing when there is none. There is no way to leave a Drift without keeping a side.

Keeping what should happen is not one single way: every new Drift also offers the developer two to five ways to fix the code, written by the agent, the first being the one it recommends. The developer cannot have the code fixed without choosing one of them, and may add a note to the choice. Keeping what happens needs no such choice. A Drift that was filed before options existed and is still Open has none; keeping what should happen then needs no choice.

Both sides are written for a developer reading them at a glance: in terms of behaviour, not of the code's inner workings. A Drift may also note where in the code the difference was seen; that note is only a pointer for whoever fixes the code and plays no part in the decision.

Un Drift nato in un worktree di un giro si decide lo stesso sulla Board del progetto aperto. La decisione è scritta nel worktree: il Task che ne nasce sta lì, e non apre un altro worktree. Il giro rilancia l'agente di quel worktree.

While it is Open a Drift blocks Tasks, because the work on them would be built on a difference nobody has decided yet. It blocks its origin Task, if any, and every Task not yet Done that concerns the same thing: the same element or one inside the other, counting the Requirements that apply to an element as part of it (a Requirement's General section counts only for the Tasks that name it). A Drift found by a Scan has no origin and blocks only the Tasks that concern the same thing. A Drift that no open Task concerns blocks nothing. A blocked Task cannot be started by the agent; see the Task.

## States

### Open (initial)
Waiting for the developer's decision.
- `developer.FIX_DRIFT_CODE` → Code to be fixed: the developer keeps the side of what should happen, choosing one of the Drift's fix options and, if they want, adding a note. Refused, with the Drift staying Open and the refusal saying that an option must be chosen, when the Drift has options and none is named, or when the one named does not exist. Creates a Task in To do that points to the same elements and carries the Drift's description, the chosen option and the developer's note; the Task is a Technical Task when the Drift points only to Requirements. The origin Task, if it is not Done, goes back to To do and stays blocked until the Task created here is Done.
- `developer.ACCEPT_DRIFT_PROPOSAL` → Proposal accepted: the developer keeps the side of what happens, only if a Proposal is attached to the Drift and that Proposal can still be approved; the attached Proposal is approved as if the developer had approved it. If it cannot be approved (still being written, rejected, discarded, already approved, stale, invalid or waiting for others) nothing changes and the Drift stays Open, saying why. The Tasks it blocked are free again.
- `developer.DISMISS_DRIFT` → Dismissed: the developer keeps the side of what happens, only if no Proposal is attached to the Drift; closes the Drift with no change to code or Model, recording that the code was kept. With a Proposal attached nothing changes and the Drift stays Open: the developer accepts that Proposal or fixes the code. The Tasks it blocked are free again.
- `agent.REPLACE_DRIFT_PROPOSAL` → Open: only if the Proposal attached to the Drift is open and stale and the agent names another Proposal that exists and was neither rejected nor discarded. The new Proposal is attached in place of the old one, which is rejected at once, with the feedback that it was replaced by the new one. The Drift stays Open.

### Code to be fixed (final)
The developer decided the Model or the Requirement is right. The Task created for it carries on the work. The other Tasks it blocked are free again; its origin Task waits for the Task created here.

### Proposal accepted (final)
The developer kept what happens: the Model changed to match the code.

### Dismissed (final)
The developer kept what happens and no Proposal was attached, so neither the code nor the Model changed.

## Events

### PROPOSAL_ACCEPTED
Emitted when the developer accepts the Proposal attached to the Drift. The Proposal reacts as if it had been approved directly.

### PROPOSAL_REPLACED
Emitted when the agent attaches a new Proposal in place of the stale one attached to the Drift. The old Proposal reacts by being rejected.
