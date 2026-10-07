# Work

The work that comes out of comparing the Model with the code, shown on the Board. Un Task o un Drift nuovo non prende l'identità da un contatore condiviso: ne ha una propria, così due branch che lo creano non si assegnano la stessa. A Task is a unit of work for the agent that the developer can see and ask the agent to run, but not move on the Board. A Drift is a difference between code and Model, or between code and Requirements, that only the developer can decide on. While the agent is preparing a card, an announcement lets the Board show a ghost of it.

Ogni Task e ogni Drift vivo ha, accanto all'identità permanente, un numero breve temporaneo (`T3`, `D3`) per leggerlo e citarlo a colpo d'occhio: è locale a ogni copia di lavoro e si libera quando la scheda si chiude. Un Task che fa parte di un design lo tiene finché non è finito tutto il design.
