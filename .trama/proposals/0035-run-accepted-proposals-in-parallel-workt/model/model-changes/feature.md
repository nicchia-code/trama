# Model changes

How the Model and its Requirements change: the agent suggests a change as a Proposal, and nothing takes effect until the developer approves it as a whole. A Proposal is only the developer's to decide on once the agent has finished writing it and handed it over; until then it is a Draft that the developer can only discard. A Proposal can be written on top of other Proposals and then can only be approved after them. A Proposal written by an import describes code that already exists, so approving it asks for no Scan.

Con l'interruttore multi-branch acceso sul progetto, accettare una Proposal ordinaria la manda in un worktree invece di copiarla nella cartella aperta; il modello arriva quando il giro è unito (vedi il Worktree round).

