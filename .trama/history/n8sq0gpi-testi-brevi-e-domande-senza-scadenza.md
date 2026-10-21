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
---
# Testi brevi e domande senza scadenza

Le `markdownDescription` delle impostazioni e ogni tooltip del pannello sono ora brevi (al massimo due frasi, circa 160 caratteri), con elenchi limitati a poche voci più `and N more`. Il riquadro del Diagramma mostra solo il titolo e la prima frase della descrizione. La tendina dei modelli nei campi `trama.analysis`, `trama.scan` e `trama.execution` ha larghezza fissa pari alla voce più lunga. Le domande all'agente non scadono mai: l'istruzione dice di lanciare `trama question new` senza limite di tempo e le skill di design, import e resolve-drifts lo spiegano anche per omp (`timeout: 0`).
