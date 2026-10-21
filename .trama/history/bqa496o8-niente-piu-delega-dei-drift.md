---
created: 2026-10-21T06:01:44.391Z
updated: 2026-10-21T06:11:15.985Z
summary: "Trama non raccoglie, approva né realizza più risoluzioni da sola: tolti autopilota, coordinatore fra finestre, impostazione driftAutoPilot e Run automatici; Resolve e Run restano manuali e per un solo Drift."
tasks:
  - 00ft2avj
  - 19ykvck5
  - 1qr779bk
  - 3m2jkzih
  - 73res1m5
  - 7z9kqh17
  - az7m0j0v
  - cf3qgyji
  - d0xy7atv
  - evpb4q1t
  - fu4ehtlq
  - gwuzzyri
  - hv7fb7f3
  - i97xr8ep
  - ip97lr8c
  - jl79x296
  - jw8w3jb5
  - k5v1etvh
  - lc530rrz
  - pqf4xuz6
  - qsijsdy1
  - sijitnp8
  - uck58ksf
  - ugt5xko8
  - up9hghz6
  - xi7e0xvi
  - zfu8joso
  - ecqj0um7
  - yg5r2sbr
---
# Niente più delega dei Drift

La delega dei Drift è stata tolta da host, CLI, Impostazioni, terminale dell'agente e Board. Spariscono l'oggetto `trama autopilot`, l'impostazione `trama.driftAutoPilot`, il coordinatore fra finestre, la barriera degli scan, la raccolta e l'approvazione automatiche, il Run automatico delle correzioni, la sospensione e i casi falliti; ogni finestra tiene in memoria solo i propri lavori. Una Proposal non è mai una risoluzione automatica: `automatic` e `job` non sono più accettati e un `automatic: true` vecchio è letto e ignorato. `Resolve` parte solo da un Drift e il messaggio `resolveDrifts` porta sempre la sua identità. Le voci di History nascono solo dai lavori avviati dal developer e il ghost «Updating History» sta in System Activities. Le skill distribuite e i documenti non descrivono più la delega.
