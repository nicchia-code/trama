---
status: approved
base:
  agent-launching/scan-hold.md: new
  agent-launching/agent-terminal.md: 67b8bea16edf1e20476d87894a0523e1e640971b65921ee65da76895d21a19ed
  agent-launching/feature.md: cfb9af6a499019694fbcb3c176031e8d09ab0b0f565a8d5fa13bf475bbc3038f
  actors/developer.md: 70f2925519417e4cc733e2f5ee98fc209a8be6d0a16ddec74c129e2603907ebb
  model-changes/proposal.md: a225a7e75f00c4400a85fb033f81309e62577067132cf302572bd621942c5bc5
  editor-panel/panel.md: 7e170713406dc180468629ca5d476bd653b2dc907666cdd5d648e1d89cc8e85d
  work/announcement.md: f2e7f1a6c47aeef8ce2e4e4b384cc317cd940aea432dbfc982d3bd8f5a0e4a92
  requirements/rules/worktrees.md: d11839750194691d7cf8c4600c9921f18ea7832c82341303368744195a5c4258
  requirements/rules/agent-terminal.md: 5f861f29570ebd42456c0d03ae1f881d6af1b00f39ec7dde59bf1ffa3ea16dbd
  requirements/tech/worktrees.md: f08d2f4bf0bc6cbd09b62fc9f670a35003c2a4a862832651684f4eb3c49bbca3
  requirements/ui/agents.md: 6ff0d19ad0d88db567286abe7bf3af90dfbef5c2caf81a4b99ecfc989232fb6b
  requirements/data/agents.md: 02670596d8aa9743fdaa4cd48760db9aea6ae2aa4b8a13235da16ac3e36f5ff1
delete: []
request: 2026-10-07T07-04-50
created: 2026-10-07T05:16:12.847Z
scanScope:
  - ref: agent-launching
    reason: changed
  - ref: developer.TURN_SCAN_HOLD_ON
    reason: changed
  - ref: developer.TURN_SCAN_HOLD_OFF
    reason: changed
  - ref: agent-terminal
    reason: changed
  - ref: agent-terminal/No agent terminal/proposal.APPROVED
    reason: changed
  - ref: agent-terminal/No agent terminal/scan-hold.RELEASED
    reason: changed
  - ref: agent-terminal/Agent running/scan-hold.RELEASED
    reason: changed
  - ref: agent-terminal/Agent idle/scan-hold.RELEASED
    reason: changed
  - ref: scan-hold
    reason: changed
  - ref: panel/Open
    reason: changed
  - ref: proposal.APPROVED
    reason: changed
  - ref: announcement
    reason: changed
  - ref: panel/Closed/developer.OPEN_PANEL
    reason: leads into a change
  - ref: panel/Closed/question-round.ROUND_OPENED
    reason: leads into a change
  - ref: agent-terminal/Agent running/proposal.APPROVED
    reason: leads into a change
  - ref: agent-terminal/Agent idle/proposal.APPROVED
    reason: leads into a change
  - ref: project/Trama project/proposal.APPROVED
    reason: leads into a change
  - ref: requirements/data#scan-hold
    reason: changed
  - ref: requirements/rules#agent-terminal
    reason: changed
  - ref: requirements/rules#scan-hold
    reason: changed
  - ref: requirements/tech#scan-hold
    reason: changed
  - ref: requirements/ui#scan-hold
    reason: changed
---
# Hold scan: rimandare la scansione automatica

La scansione automatica dopo ogni approvazione è pesante. Quando il developer sa che approverà più modifiche che toccano le stesse parti, vuole rimandare la scansione e farla partire una volta sola alla fine, anche se nel frattempo una parte resta in Drift.

Decisioni prese nell'intervista:
- Meccanismo: un interruttore «Hold scan» della copia di lavoro, accanto a Multi-branch, con il contatore delle approvazioni non scansionate.
- Entrano nel sospeso le approvazioni che oggi farebbero partire la scansione automatica, anche senza comando dell'agente configurato (Trama lo chiede allo spegnimento).
- Con `trama.autoScan` spento non si accumula nulla.
- La scansione parte spegnendo lo switch; senza nulla in sospeso non parte niente. Nessuna conferma.
- Una sola corsa confronta l'unione degli ambiti di scansione delle Proposal in sospeso; ogni Task è legato alla Proposal più recente il cui ambito lo copre.
- L'implementazione automatica vale come oggi: se nessun Drift, l'agente realizza i Task di quelle Proposal.
- Le scansioni lanciate a mano non svuotano mai il sospeso.
- Hold scan non tocca i worktree del multi-branch.
- Switch e sospeso sono locali alla copia di lavoro, non versionati.
- Se la scansione non può partire, lo switch resta acceso, il sospeso resta intatto e il developer è avvisato.
- Se nessuna Proposal in sospeso tocca più una Feature esistente, lo switch si spegne e il sospeso si azzera, con un avviso.
- Il sospeso si azzera all'invio dell'istruzione.
- Testi: switch `Hold scan` con ` · N` quando N > 0, subito dopo Multi-branch in Diagramma, Board e Requirements; tooltip `When on, approvals wait and one scan runs when you turn it off.`

Assunzioni da verificare:
- Lo spegnimento è un gesto del developer, quindi l'istruzione segue la catena di consegna dei pulsanti (in Cursor anche il deeplink o gli appunti), non l'avviso «Scan now» della scansione automatica.
- Il terminale della scansione in sospeso si chiama `Scan` e annuncia un controllo come le altre scansioni.
- L'istruzione elenca le Proposal in sospeso dalla più vecchia alla più recente.
