---
created: 2026-10-17T21:37:03.864Z
updated: 2026-10-17T21:37:03.864Z
summary: I test di lancio degli agenti chiudono i terminali e le chat che aprono, così non lasciano lavori aperti nella suite.
tasks:
  - 5jb37xbg
cleared:
  5jb37xbg:
    title: Test che chiudono i lavori
    proposal: bjt6vdn9
    tag: Test unitari
    finished: 2026-10-17T21:29:28.732Z
    refs: []
---
# Test: chiusura dei lavori

In test/host-agent-terminals.test.ts i test di Resolve, di scansione, di import, di Run e della chat chiudono nel finally i terminali e le conversazioni creati. Le asserzioni esistenti non sono cambiate. Il file passa da dodici fallimenti a zero su cinquantacinque test.
