---
created: 2026-10-21T14:38:54.929Z
updated: 2026-10-21T14:38:54.929Z
summary: Spiegazioni delle impostazioni e tooltip di al massimo due frasi brevi, tendina dei modelli larga come la voce più lunga, riquadro del Diagramma con titolo e prima frase; le domande all'agente non hanno più scadenza.
tasks:
  - 99fr6dzm
  - fl0la20x
  - huo89z8r
  - jt4f9ik0
  - wll4t0n3
cleared:
  wll4t0n3:
    title: Tooltip brevi ovunque
    proposal: suaaekyh
    tag: Tooltip concisi
    finished: 2026-10-21T14:38:09.090Z
    refs:
      - editor-panel
      - requirements/ui#General
  99fr6dzm:
    title: Impostazioni concise e tendine
    proposal: suaaekyh
    tag: Tooltip concisi
    finished: 2026-10-21T14:34:46.718Z
    refs:
      - panel/Settings
      - requirements/ui#panel/Settings
      - requirements/ui#agent-terminal
      - requirements/ui#agent-launching
      - requirements/ui#drift-resolution
  huo89z8r:
    title: Domande senza scadenza
    proposal: suaaekyh
    tag: Tooltip concisi
    finished: 2026-10-21T14:33:57.591Z
    refs:
      - question-round
      - agent.STOP_WAITING
      - requirements/rules#question-round
      - requirements/tech#question-round
  jt4f9ik0:
    title: Riquadro breve del Diagramma
    proposal: suaaekyh
    tag: Tooltip concisi
    finished: 2026-10-21T14:33:49.985Z
    refs:
      - diagram
      - requirements/ui#diagram
  fl0la20x:
    title: Istruzione senza scadenza
    proposal: suaaekyh
    tag: Tooltip concisi
    finished: 2026-10-21T14:33:28.613Z
    refs:
      - agent-terminal
      - requirements/rules#agent-terminal
---
# Testi brevi e domande senza scadenza

Le `markdownDescription` delle impostazioni e ogni tooltip del pannello sono ora brevi (al massimo due frasi, circa 160 caratteri), con elenchi limitati a poche voci più `and N more`. Il riquadro del Diagramma mostra solo il titolo e la prima frase della descrizione. La tendina dei modelli nei campi `trama.analysis`, `trama.scan` e `trama.execution` ha larghezza fissa pari alla voce più lunga. Le domande all'agente non scadono mai: l'istruzione dice di lanciare `trama question new` senza limite di tempo e le skill di design, import e resolve-drifts lo spiegano anche per omp (`timeout: 0`).
