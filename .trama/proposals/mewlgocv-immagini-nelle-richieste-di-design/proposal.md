---
status: approved
base:
  agent-launching/design-request.md: 90f1dbb620e3429f3647cc4ced3f00284c729312d0c3fe2fdc7a8bbdaf29ac75
  requirements/data/agents.md: c8ffcae30069f19137ed1b51824f35842afc50b30f37c2ae3aac8e72ce37a932
  requirements/rules/requests.md: 2225fc6668d6455e23499989c449a2d9e2b89835fc44317f210a2973e506117c
  requirements/tech/requests.md: 32d4acf2faa75a2925f41427a710c050fab2fef64fb296b5ba92ad304341e0d6
  requirements/ui/agents.md: e0cd2c04112033f1534d4026ff304291e1596215c0bd6fe0cba1c12499eafdc5
delete: []
request: 2026-10-17T16-38-41
created: 2026-10-17T14:46:47.562Z
label: Immagini nelle richieste
---
# Immagini nelle richieste di design

Il developer vuole mettere immagini nella richiesta di design scritta, con CTRL+V o Drag&Drop nel documento, per dare contesto all'agente che scrive la Proposal. Le immagini vivono solo nella richiesta: dopo non sono più passate né usate.

Decisioni dell'intervista:
- Inserimento: CTRL+V o Drag&Drop nella scheda della richiesta; l'immagine è copiata in una cartella propria della richiesta, `requests/<id>.images/`.
- Tecnica: un default di `markdown.copyFiles.destination` contribuito con `configurationDefaults`; nessun provider di incolla/trascina proprio.
- Un'immagine che sta già nel progetto non si copia: la richiesta la linka e non viene mai cancellata.
- Solo immagini: altri file sono trattati come oggi dall'editor e l'agente non li considera.
- Pulizia: la cartella sparisce ogni volta che sparisce la richiesta (consegna della Proposal legata, chiusura di una richiesta vuota, cancellazione del file da fuori).
- Vale anche per la richiesta di setup di Start from Scratch.
- Una richiesta fatta solo di immagini non è vuota e parte.
- Il titolo salta le righe fatte solo di un'immagine; senza altre righe è l'ID della richiesta.
- L'agente guarda le immagini linkate, anche con un URL web se può; quelle che non riesce a vedere le ignora in silenzio.
- Nessuna validazione nuova: basta la skill, che dice di descrivere a parole ciò che conta e di non copiare né linkare le immagini nella Proposal.
- Il testo fantasma aggiunge «Paste or drop images for context.»; l'istruzione di una riga all'agente non cambia.

Assunzioni:
- Le cartelle di immagini rimaste senza richiesta mentre nessun editor aveva il progetto aperto sono cancellate dall'estensione quando si attiva sul progetto.
