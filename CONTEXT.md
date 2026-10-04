# Trama

A tool for programming from a visual and textual Model of every state a software system can be in. The Model guides both the agent that implements it and the developer who needs to think clearly about it.

## Language

### The Model

**Model**:
The layered description of every State, Event and Transition of the System; it is the primary source of truth and matters far more than the code.
_Avoid_: diagram (for the Model itself), spec, schema

**Diagram**:
The visual rendering of a portion of the Model.
_Avoid_: graph, canvas (for the concept)

**System**:
The whole software described by a Model; the top level, containing Features and Actors.
_Avoid_: project, app, product

**Feature**:
A group of Machines that together deliver a capability the user can recognise, e.g. Checkout.
_Avoid_: module, epic, capability

**Machine**:
The behaviour of one kind of domain or UI thing (e.g. every Order), with one initial State, zero or more final States and the Transitions between them; it talks to other Machines only through Events.
_Avoid_: statechart, automaton, component

**Actor**:
Something outside the System, such as the user, an external service or time, that emits Events but has no States in the Model and reacts to nothing in it; it belongs to the System and is shared by all Features.
_Avoid_: external system, integration, client

**State**:
A distinct situation a Machine can be in, described in domain terms and never as a combination of variable values. A State can expand into sub-States as a zoom level; concurrency is expressed only through separate Machines.
_Avoid_: step, phase, status

**Event**:
Something that happens, owned by the Machine or Actor that emits it, which other Machines can react to; the only way Machines talk to each other.
_Avoid_: message, action, signal

**Transition**:
A Machine moving from one State to another in reaction to an Event, with its condition and consequence written as free prose.
_Avoid_: arrow, edge

### How it is built

**Requirement**:
A statement of how the System must be built rather than what it does: interface, technology and constraints, quality, data, business rules. Requirements live beside the Model, not in it, and can be attached to the System, a Feature, a Machine or a State.
_Avoid_: spec, acceptance criterion, constraint (for the concept)

**Area**:
A named group of Requirements kept together, such as the interface or the data, with a sentence saying when an agent needs it.
_Avoid_: category, section, topic

### Changing the Model

**Proposal**:
A change to the Model and its Requirements suggested by the agent, which has no effect until a developer approves it as a whole. A Proposal may require earlier open Proposals: it is written on top of them and can be approved only after them.
_Avoid_: suggestion, patch, draft

**Drift**:
A difference between code and the Model large enough to change the Diagram, or code that contradicts a Requirement, which the developer must resolve. It states two sides, **what happens** (the code) and **what should happen** (the Model or the Requirement), written for a programmer reading at a glance, in terms of behaviour, offers from two to five **fix options** for the code, the first the one the agent recommends, and may add where in the code the difference was seen. The developer always keeps one: keeping what should happen has the code fixed with one chosen option and an optional note; keeping what happens leaves the Model to match the code, through the attached Proposal or, when there is none, by changing nothing. By default the code is fixed; the agent attaches a Proposal only when the code handles a case the Model forgot.
An open Drift **blocks** its origin Task (the one the agent was implementing when it filed it) and every unfinished Task that concerns the same thing; the agent cannot start a blocked Task, and the developer can still move it.
_Avoid_: divergence, mismatch, bug

### Work

**Scan**:
The agent's comparison between the Model and its Requirements, explored through Trama, and the existing code, producing Tasks and Drifts.
_Avoid_: audit, analysis, sync

**Import**:
The agent describing existing code, as it is, through Proposals for the Model and its evident Requirements; what the documentation contradicts or the code seems to get wrong is recorded as a doubt, never corrected.
_Avoid_: reverse engineering, sync, generation

**Task**:
A unit of work for the agent that the developer can see and edit on the board.
_Avoid_: ticket, issue, todo

**Technical Task**:
A Task that does not change the System's behaviour and therefore references no part of the Model, e.g. a refactor or a dependency upgrade.
_Avoid_: chore, tech debt
