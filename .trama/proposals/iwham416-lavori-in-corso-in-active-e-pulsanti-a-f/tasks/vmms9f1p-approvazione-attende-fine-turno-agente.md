---
technical: false
refs:
  - proposal/Open
  - proposal/Draft/agent.SUBMIT_PROPOSAL
---
# Approvazione e rifiuto di una Proposal attendono la fine del turno di chi l'ha consegnata

Quando l'agente consegna una Proposal (`agent.SUBMIT_PROPOSAL`, Draft → Open), anche dopo una modifica, la consegna deve registrare quale agente l'ha consegnata (il terminale o la chat da cui viene), così che il pannello possa riconoscere la fine del turno proprio di quell'agente.

Finché quell'agente non ha finito il suo turno, dal pannello una Proposal Open appena consegnata non si approva né si rifiuta: i controlli di approvazione e rifiuto, sulla Board e nel Diagramma, restano disabilitati e dicono `The agent is still finishing`, e si abilitano da soli alla fine del turno (idle dell'hook, fine del comando, chiusura del terminale, fine o interruzione o chiusura del turno di chat). Si aspetta soltanto l'agente che l'ha consegnata, mai gli altri agenti al lavoro. Nessun timer: lo stato vive in memoria nell'host dell'estensione. Quando Trama non può riconoscere la fine del turno di chi l'ha consegnata, non aspetta e i controlli sono subito abilitati. La riga di comando (`trama proposal approve` / `reject`) non aspetta mai.

Le altre condizioni di Open (blocco, Proposal allegate a un Drift aperto) restano invariate. Aggiornare i test dell'host e della webview che coprono i pulsanti di approvazione e rifiuto.
