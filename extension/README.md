# Trama

Trama keeps a map of your app next to your code and raises a Drift when the two stop agreeing. See the project README for how it works.

## Settings

Trama's settings are changed from the VS Code settings, or from the **Settings** tab of the Trama panel. The tab has four groups: **omp**, **Models**, **Project** and **Advanced**, which is split into the subgroups **Appearance**, **Drifts**, **Agents** and **omp Chat**. It always writes to the user settings, never to the workspace.

**Auto-update stale Proposals** (`trama.autoUpdateStaleProposals`, off by default, in the **Agents** subgroup of **Advanced**): when on, approving a stale Proposal does not write it at once. The Proposal joins a queue, in Backlog order, and the agent refines it onto the current Model first; the Proposal is approved when the agent delivers it unblocked. A Proposal still stale after one refinement, or blocked for another reason, stays Open and Trama says why. The queue lives in the editor window: turning the setting off clears it, and a refinement already running finishes.

While a Run launched from the window is in progress, Approve waits for it: the button says `A run is in progress`. A Proposal the agent refines during that Run is marked `waiting for the run` and is approved when the Run ends.

**Parallel execution** (`trama.parallelExecution`, in the **Agents** subgroup of **Advanced**): when on, Run all starts the Runs of the Tasks cut by model together, instead of one after the other. `trama.maxParallelAgents` (default 20, in the **Models** group) is the number of sub-agents the Runs share: each Run gets a share in proportion to its executable Tasks, at least one, and the shares never add up to more than the limit. Runs that do not fit the limit wait for a place, one place each. A Run that ends abnormally stops the Runs that have not started; the Runs already working go on. The project stays held until the last Run ends.
