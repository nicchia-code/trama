---
status: approved
base:
  work/announcement.md: 2bdaac8a55585cc6126c9171160f9d182fa42c1f18b469c3f10a59c9a90ec00c
  agent-launching/raffinamento.md: 59751790cb167c2c581ca51b00084286320544c2aeba660d0fbb635289605a57
  requirements/rules/announcements.md: 3a11510c89d615a2e128c2890eb6134c554184929aa79639dd9866f98018d215
  requirements/rules/raffinamento.md: 0f58dbb9c9ff8e5bb364ee56a12d670ad0e529b4d2c01021d9747341ceae1221
  requirements/tech/raffinamento.md: bfea9fb9cd73826df6d118054477fba087e089ada64644a489ba3f2e5ede75e6
  requirements/ui/ghosts.md: d31aa774fcef99508857e49116b4ac059fb557de0982e78f4e8bd548879915e1
delete: []
request: 2026-10-25T10-02-32
created: 2026-10-25T09:07:35.006Z
label: raffinamento
---
# Raffinamento senza ghost

Il raffinamento di una Proposal obsoleta non deve mai mostrare un ghost: la sua scheda è già in Backlog, segnata `refining`, con fase e ultima nota dell'agente. Il Modello lo diceva già, ma nel codice restava un caso: quando l'agente trova la modifica già nel Modello e il developer sceglie Remove, la Proposal è rifiutata mentre il suo annuncio resta vivo; senza più una scheda, la Board disegna un ghost con il suo titolo fino alla fine del lavoro, e al ritiro prepara l'avviso di mancata consegna.

Decisioni:
- Il rifiuto di una Proposal ritira subito l'annuncio legato a lei, senza ghost e senza avviso, come la consegna e lo scarto (vale per ogni rifiuto; oggi accade solo nel raffinamento).
- Il raffinamento continua ad avere il suo annuncio legato alla Proposal, senza ghost: serve alla fase e alla nota sulla scheda e a riconoscere una Draft raffinata da un'altra finestra o a mano.
- Nessun controllo nuovo nella riga di comando contro annunci o Proposal creati dall'agente che raffina: basta la skill, che gli dice di non annunciare schede.
