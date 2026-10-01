# The CLI explores the Model, it does not verify code

The CLI lets the agent explore how the System should be (Features, Machines, States, Events, Transitions) and manage Proposals, Tasks and Drifts; it never compares code against the Model. The Model therefore stays a semantic description: Transition conditions and consequences are free prose, with no variables and no references to code. Keeping code in sync is the agent's discipline, enforced by skills: a Scan or an implementation that finds a Drift stops and surfaces it to the developer. No deterministic CI check guarantees sync.

## Considered Options

A runtime that executes the Model, ID annotations in code and tests bound to Transitions were rejected. They would guarantee sync, but they would push variables and implementation details back into the Model, tie the product to specific languages and turn the Model from "how it should be" into "how it runs".
