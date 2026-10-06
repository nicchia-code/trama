---
status: approved
base:
  requirements/tech/work.md: a6e26f06413cfc87a198aee4786c36b3076e2cc14968d21995035d23ce1551ec
delete: []
created: 2026-10-06T20:22:59.227Z
scanScope:
  - ref: requirements/tech#announcement
    reason: changed
---
# Sincronizzare il titolo degli annunci Writing

Risolve il conflitto descritto dal Drift wnjn5o74 e autorizza la soluzione richiesta dal Task q8o95qpd, senza modificare codice o decidere il Drift.

Decisione confermata dal developer: deroga limitata alla scrittura del titolo degli annunci Writing già associati a una Draft, anche quando il titolo della Draft è modificato direttamente.

Il titolo persistito segue il titolo corrente della Draft; l’associazione iniziale resta responsabilità della riga di comando. L’estensione non modifica identità, tipo, origine, appartenenza, associazione o `touched` durante la sola sincronizzazione e non ricrea annunci consegnati o ritirati. Le regole esistenti di attività, quiete, consegna e ritiro restano invariate. Una Draft non leggibile o non più Draft non autorizza l’aggiornamento.

Ambito: solo requirements/tech#announcement. Modello, altri Requisiti, ntfy e notifiche esterne restano invariati. Dopo la revisione il developer può accettare questa Proposal sul Drift e riprendere i Task già esistenti; non occorrono altri Drift o Task per ottenere la deroga.
