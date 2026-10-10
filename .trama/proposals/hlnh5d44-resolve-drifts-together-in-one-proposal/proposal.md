---
status: approved
base:
  work/drift.md: 7390f60fc55994cfd47e6435c7d445865ae6d3c7e3f5df1cc4822fb48937c376
  model-changes/proposal.md: 6c89387bdc26411251d6fd75c31529466c403b31c68b82541ddde46093a8be78
  work/announcement.md: d9612d2046cdf0cb9ddc654ed6c196e971152154a9488dd29a7b489a91d011be
  actors/agent.md: cd1df28c85b40b5a1c5f032870fef4355575d3fcf4e6640d1ea82f3c1b69ca6a
  actors/developer.md: 540af87ad95d6d41fe173beea12af1765b2f718338b1b2de1b354a01a6e60cfd
  agent-launching/agent-terminal.md: c8a060837197719269b0d7cff06c46b1fd06a54fed2a9054ce99266487cc6b42
  agent-launching/feature.md: 9157047e61b2987a97f283b1dca43e862e82f70caef7306ef530a72c79af3ba6
  agent-launching/drift-resolution.md: new
  agent-launching/scan-hold.md: 9b55dd12258ca62332c9d9effb941d7a57c91430cd4cdd5426eab0698d21b599
  editor-panel/panel.md: 7246209b18d2311ab0386e8155f7338f2d621ef68e3b4170bb0ebc5e8364baf9
  agent-questions/feature.md: baab55981073775640ebb2b58d64e8f2932ec67611e906ce24737392ace18734
  requirements/ui/work.md: c94cf78d347b5d11dec767e25ea69a20af5ce3969dd31e041e568af6eee6f235
  requirements/ui/panel.md: f2be682e8f93cd5e03396feb2a6f71f4a7fb8c6070c2d0c03d9f722e48678eb5
  requirements/data/work.md: a99d5ab5d745df13f8a011b3bebfcd4373f6b1cf6621ce8d91d81398916adf13
  requirements/data/agents.md: d0b18057695a29bb00e9a75791a67e1942d7d956c53fb5e9c8d19701e84e83b3
  requirements/rules/decisions.md: 6735af9b067362c00d5cdc1d524dd029b0a14afc62ae9faaec648c7ec9a832ce
  requirements/rules/tasks.md: b529b7454b880e90cba982bd02233a9e13f9431e8385ad1cef186f96b0048630
  requirements/rules/agent-terminal.md: e49f88ce68c96ec70a8a6ac9ade1c69a783cfeae57a03900e4b47413e558277d
  requirements/rules/models.md: 21d24aeff558aa66cad6ea8f18e5647f656f8ead78de6e97a4873b5bd1b6d58d
  requirements/rules/announcements.md: abebf0341dd71d5819177ca40c2cecb65bb47f3fbf02d4c176fa00f379e37a6f
  requirements/rules/questions-notices.md: 05a8146e750cf03ea85877860ba7570d53cbefb9850ddfaa9abfb4d2c2cc1a8b
  requirements/tech/work.md: 706308c1dde57480ad3049215710d620cccd5cca62934b8b51553987d0aba456
  requirements/tech/announcements.md: 586caf3eda5c563f19084540c02b81845cc89b0582c3915e25a343645743925b
  requirements/tech/general.md: 832a31775fa23c92cad83f1535971bc9b86ee8017d19d779e4c8c8a6a1e1c45b
  requirements/tech/questions-notices.md: 9cdbc598527be8fab7abd4b7109e52fb508813394c469a4996e23750de7fbb42
  actors/time.md: c12a0442adbba86a9a075a8180a120f74026e6f0c7ce9f246f642e80e07061a8
  requirements/rules/drifts.md: new
  requirements/rules/scan-hold.md: 9f24d8659d5d5285f7d767c388c907484b513f053d4e34393138968d03b320fd
delete: []
request: 2026-10-09T08-39-20
created: 2026-10-09T06:57:23.631Z
scanScope:
  - ref: agent-launching
    reason: changed
  - ref: agent-questions
    reason: changed
  - ref: agent
    reason: changed
  - ref: agent.EDIT_PROPOSAL
    reason: changed
  - ref: developer.APPROVE_PROPOSAL
    reason: changed
  - ref: developer.REJECT_PROPOSAL
    reason: changed
  - ref: developer.FIX_DRIFT_CODE
    reason: changed
  - ref: developer.ACCEPT_DRIFT_PROPOSAL
    reason: changed
  - ref: developer.DISMISS_DRIFT
    reason: changed
  - ref: developer.ASK_AGENT
    reason: changed
  - ref: time.QUIET_PERIOD_ELAPSED
    reason: changed
  - ref: agent-terminal
    reason: changed
  - ref: agent-terminal/No agent terminal/proposal.APPROVED
    reason: changed
  - ref: drift-resolution
    reason: changed
  - ref: scan-hold/On/proposal.APPROVED
    reason: changed
  - ref: panel/Diagram
    reason: changed
  - ref: panel/Board
    reason: changed
  - ref: proposal
    reason: changed
  - ref: proposal/Draft/agent.SUBMIT_PROPOSAL
    reason: changed
  - ref: proposal/Draft/agent.EDIT_PROPOSAL
    reason: changed
  - ref: proposal/Draft/drift.RESOLVED_BY_PROPOSAL
    reason: changed
  - ref: proposal/Open/developer.APPROVE_PROPOSAL
    reason: changed
  - ref: proposal/Open/drift.RESOLVED_BY_PROPOSAL
    reason: changed
  - ref: proposal/Open
    reason: removed, its container
  - ref: proposal/Rejected
    reason: changed
  - ref: proposal.APPROVED
    reason: changed
  - ref: announcement
    reason: changed
  - ref: announcement/Announced/agent.SUBMIT_PROPOSAL
    reason: changed
  - ref: announcement/Announced
    reason: removed, its container
  - ref: drift
    reason: changed
  - ref: drift/Open/developer.FIX_DRIFT_CODE
    reason: changed
  - ref: drift/Open/developer.ACCEPT_DRIFT_PROPOSAL
    reason: changed
  - ref: drift/Open/developer.DISMISS_DRIFT
    reason: changed
  - ref: drift/Open/proposal.APPROVED
    reason: changed
  - ref: drift/Open
    reason: removed, its container
  - ref: drift/Dismissed
    reason: changed
  - ref: drift.CODE_FIX_CHOSEN
    reason: changed
  - ref: drift.RESOLVED_BY_PROPOSAL
    reason: changed
  - ref: panel/Open/developer.SHOW_DIAGRAM
    reason: leads into a change
  - ref: panel/Open/developer.SHOW_BOARD
    reason: leads into a change
  - ref: proposal/Open/developer.REJECT_PROPOSAL
    reason: leads into a change
  - ref: proposal/Open/drift.CODE_FIX_CHOSEN
    reason: leads into a change
  - ref: proposal/Open/agent.EDIT_PROPOSAL
    reason: leads into a change
  - ref: agent-terminal/No agent terminal/developer.ASK_AGENT
    reason: leads into a change
  - ref: agent-terminal/Agent running/developer.ASK_AGENT
    reason: leads into a change
  - ref: agent-terminal/Agent idle/developer.ASK_AGENT
    reason: leads into a change
  - ref: design-request/Writing/developer.ASK_AGENT
    reason: leads into a change
  - ref: announcement/Announced/time.QUIET_PERIOD_ELAPSED
    reason: leads into a change
  - ref: agent-terminal/Agent running/proposal.APPROVED
    reason: leads into a change
  - ref: agent-terminal/Agent idle/proposal.APPROVED
    reason: leads into a change
  - ref: project/Trama project/proposal.APPROVED
    reason: leads into a change
  - ref: proposal/Draft/drift.CODE_FIX_CHOSEN
    reason: leads into a change
  - ref: requirements/data#drift-resolution
    reason: changed
  - ref: requirements/data#drift
    reason: changed
  - ref: requirements/data#announcement
    reason: changed
  - ref: requirements/data#proposal
    reason: changed
  - ref: requirements/rules#agent-terminal
    reason: changed
  - ref: requirements/rules#announcement
    reason: changed
  - ref: requirements/rules#proposal
    reason: changed
  - ref: requirements/rules#proposal/Approved
    reason: changed
  - ref: requirements/rules#drift
    reason: changed
  - ref: requirements/rules#drift-resolution
    reason: changed
  - ref: requirements/rules#agent-launching
    reason: changed
  - ref: requirements/rules#question-round
    reason: changed
  - ref: requirements/rules#scan-hold
    reason: changed
  - ref: requirements/rules#task
    reason: changed
  - ref: requirements/tech#announcement
    reason: changed
  - ref: requirements/tech#General
    reason: changed
  - ref: requirements/tech#panel
    reason: changed
  - ref: requirements/tech#question-round
    reason: changed
  - ref: requirements/tech#drift
    reason: changed
  - ref: requirements/tech#proposal
    reason: changed
  - ref: requirements/ui#General
    reason: changed
  - ref: requirements/ui#panel/Board
    reason: changed
  - ref: requirements/ui#drift
    reason: changed
  - ref: requirements/ui#drift-resolution
    reason: changed
  - ref: requirements/ui#proposal
    reason: changed
---
# Resolve Drifts together in one Proposal

La gestione dei Drift uno per uno è caotica e va in loop quando i Drift sono tanti, come dopo scansioni lunghe: ogni Proposal allegata diventa obsoleta quando se ne approva un'altra, e ogni approvazione fa partire una scansione che ne archivia di nuovi. Questa modifica toglie la decisione dalle singole schede e la porta in un'unica risoluzione guidata.

Decisioni prese nell'intervista:
- La scheda di un Drift, nella Board e nel Diagramma, mostra solo il titolo e i due lati (What happens, What should happen): niente Fix options, niente Proposal allegata, niente pulsanti per decidere.
- Dietro le quinte scan e implement continuano ad archiviare i Drift con le Fix options e, quando serve, con una Proposal allegata, che il pannello non mostra più.
- La risoluzione singola da riga di comando (`trama drift resolve`) resta, solo per il developer.
- Nuovo pulsante «Resolve Drifts» nella barra della Board, accanto a «Run all To do»; disabilitato con il motivo nel tooltip e per le tecnologie assistive.
- Copre tutti i Drift aperti al clic.
- Una nuova skill, `trama-resolve-drifts`, sul modello di analisi, fa un round di domande con l'overlay dei round esistente: una domanda per Drift che presenta la situazione e cosa potrebbe succedere, senza dire cosa fa oggi il codice; le opzioni sono le Fix options e il comportamento del codice, con una raccomandazione e i pro e i contro nei dettagli.
- Una domanda saltata lascia il Drift fuori e aperto. La risposta libera diventa la nota della correzione.
- La Proposal di risoluzione porta tutte le decisioni: approvarla adegua il Modello, chiude i Drift tenuti e crea i Task di correzione. Con molti Drift l'agente può dividerla in Proposal in catena; ogni Drift sta in una sola.
- Le decisioni stanno nella Proposal, registrate dall'agente con un comando per Drift.
- La scheda della Proposal di risoluzione elenca i Drift che risolve con la decisione di ciascuno; la scheda del Drift non lo dice.
- Approvata, non fa partire nessuna scansione, come un import. Le Proposal allegate ai Drift risolti sono messe da parte in quel momento; se è rifiutata restano per la volta dopo. Un Drift già risolto da riga di comando è ignorato.
- Se diventa obsoleta il developer la rifiuta e rilancia. Il rifacimento della Proposal obsoleta di un Drift (pulsante e `trama drift replace-proposal`) è rimosso.
- «Resolve Drifts» e i tre Run («Run all To do», «Run», «Run this design») si escludono a vicenda finché l'agente lanciato non finisce: fine del comando nel terminale o del turno in chat, oppure, quando la fine non si può vedere, quindici minuti di quiete. «Resolve Drifts» resta disabilitato anche finché una Proposal di risoluzione aspetta una decisione.
- Al lancio la Board mostra il ghost della Proposal in arrivo, come per il design.

Scelte fatte durante la scrittura, da controllare:
- Le tre decisioni possibili per un Drift sono quelle di oggi: adeguare il Modello (Proposal accepted), chiudere senza cambiare nulla (Dismissed), correggere il codice con un'opzione (Code to be fixed).
- L'esclusione fra lanci è una nuova Machine `drift-resolution` in Agent launching, tenuta in memoria dalla finestra: riaprire l'editor la azzera.
- La quiete dei quindici minuti vale solo per i lavori di cui Trama non vede la fine con certezza (finestra del terminale esterno, terminale senza fine dei comandi, chat di un editor senza hook); altrimenti un Run lungo senza comandi di Trama libererebbe il blocco a metà.
- Un'istruzione lasciata pronta nella chat o copiata negli appunti non apre nessun lavoro in corso, quindi non blocca nulla.
- Una risposta «comportamento del codice» diventa `proposal` quando il Modello o i Requisiti devono cambiare (sempre se il Drift ha una Proposal allegata), altrimenti `dismissed`.
- Una risoluzione si crea con `trama proposal new --resolution` e ogni decisione con `trama proposal resolve-drift <id> <drift> --decision …`; il terminale si chiama `Drifts`; l'istruzione nomina gli ID dei Drift aperti all'invio.
- Le Proposal allegate ai Drift aperti spariscono anche dal selettore del Diagramma; la scheda e i dettagli del Drift non mostrano più nemmeno Where in the code.
