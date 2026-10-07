# Model changes

How the Model and its Requirements change: the agent suggests a change as a Proposal, and nothing takes effect until the developer approves it as a whole. Una Proposal nuova non prende l'identità da un contatore condiviso: ne ha una propria, così due branch che la creano non si assegnano la stessa. A Proposal is only the developer's to decide on once the agent has finished writing it and handed it over; until then it is a Draft that the developer can only discard. A Proposal can be written on top of other Proposals and then can only be approved after them. A Proposal written by an import describes code that already exists, so approving it asks for no Scan.

Ogni Proposal ha, accanto all'identità permanente, un numero breve temporaneo (`P3`) per leggerla e citarla a colpo d'occhio: è locale a ogni copia di lavoro e si libera quando la Proposal è decisa.

