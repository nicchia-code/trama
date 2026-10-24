---
created: 2026-10-21T06:01:44.573Z
updated: 2026-10-21T06:01:44.573Z
summary: "Un Drift non ha più il segno critico: il campo è ignorato in lettura e non è più accettato; la scheda rossa è compatta, con Show details e senza Resolve all."
tasks:
  - 81cv9wkz
  - rt3vnsz5
  - yaymv2gr
cleared:
  rt3vnsz5:
    title: Scheda Drift compatta e icone
    proposal: c9fp4trm
    tag: System Activities
    finished: 2026-10-21T05:52:53.705Z
    refs:
      - requirements/ui#panel
      - requirements/tech#panel
  yaymv2gr:
    title: Resolve e dettagli del Drift
    proposal: c9fp4trm
    tag: System Activities
    finished: 2026-10-21T05:50:36.109Z
    refs:
      - requirements/ui#drift
  81cv9wkz:
    title: Drift senza gravità critica
    proposal: c9fp4trm
    tag: System Activities
    finished: 2026-10-21T05:45:28.097Z
    refs:
      - drift
      - requirements/rules#drift
      - requirements/tech#drift
      - requirements/data#drift
---
# Drift senza gravità e scheda compatta

`critical` non è scritto né accettato da `trama drift new` e dai confronti, e un valore salvato prima è letto e ignorato. Sulla Board la scheda del Drift è chiusa di default con numero, titolo e badge, ha `Resolve` con icona e tooltip nuovi, `Dismiss Drift` e un toggle `Show details` per riferimenti, lati e `Not blocking`; i dettagli non rimandano più a Resolve all.
