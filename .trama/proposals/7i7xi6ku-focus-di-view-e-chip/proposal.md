---
status: approved
base:
  editor-panel/focus.md: new
  editor-panel/panel.md: cf924a1bb98c09c2cbdc19bbb50f9a1bfd3f126122a458c5a86eee8093fba983
  editor-panel/diagram.md: 8f87f40d772857c7c2aaa92fc7dc2ea033c4536f260575f9d8f05caa3f89357e
  actors/developer.md: dd1681afdf5a631a883678b3f9e9cedb047c542b4851527ede9378031e21d66b
  requirements/ui/focus.md: new
  requirements/rules/focus.md: new
  requirements/ui/work.md: e40a8a9387943b4585686427b87054249da5229b8ceb542c50dcfa57c1b364e4
delete: []
request: 2026-10-20T23-57-07
created: 2026-10-20T22:08:07.278Z
label: Focus View
---
# Focus di View e chip

Oggi `View on diagram` e `View requirements` esistono solo sulla scheda di una Proposal in Backlog e si limitano ad aprire la scheda con la Proposal disegnata: niente zoom, niente evidenza, niente scorrimento. I chip dei riferimenti selezionano un solo elemento adattando la vista a tutto il livello, e nei Requisiti filtrano alle sezioni col nome esatto. Questa Proposal introduce il **Focus**: arrivando da un pulsante View o da un chip, la scheda evidenzia ciò che riguarda, ci zooma o ci scorre, e lo si percorre a passi.

## Decisioni

- Pulsanti: `View on diagram` e `View requirements` sia sulla scheda Proposal in Backlog (focus sul suo scope) sia, nuovi, sulla scheda di un Task in Active (focus sui suoi riferimenti).
- Anche i chip dei riferimenti (Task, Drift, voci di History) aprono un focus, su un solo riferimento.
- Diagramma su più livelli: un passo per livello, con una barra `1 of N ‹ ›`.
- Diagramma: gli elementi del focus tengono i colori del cambiamento (o il ciano se non cambiano) e il resto del livello si attenua.
- Zoom animato che adatta la vista agli elementi del passo, con un limite di ingrandimento; istantaneo con movimento ridotto.
- Fine del focus: `Clear` nella barra o Esc, un'altra Proposal scelta nel selettore, un altro pulsante o chip. Cambiare livello a mano lo conserva.
- Requisiti: tutto visibile, sezioni del focus evidenziate, scorrimento alla prima, barra `1 of N ‹ ›` e interruttore `Only these`.
- Ogni pulsante o chip sostituisce del tutto il focus e la Proposal disegnata di prima.
- Focus di una Proposal = il suo scope: elementi del Modello che cambia più quelli a cui sono intitolate le sezioni che cambia; nei Requisiti le sezioni che aggiunge, cambia, toglie o sposta.
- Focus di un Task (o di un chip) nei Requisiti: le sezioni e le Aree che nomina, più quelle intitolate ai suoi elementi o a ciò che contengono. Non le ereditate né `General`.
- Colore di un elemento del focus che non cambia: ciano.
- I pulsanti compaiono solo se la loro scheda ha qualcosa da evidenziare.
- Un chip `specs#<campo>` apre la scheda Specs, scorre al campo e lo evidenzia.
- Dettagli del Diagramma all'arrivo: la Proposal, per il pulsante di una Proposal; il primo elemento del passo, per un Task o un chip.
- Riferimenti che non si trovano: saltati e contati nella barra (`1 not found`, con l'elenco nel tooltip).
- Ordine dei passi: quello della scheda (Modello nel Diagramma, pagina nei Requisiti).
- La barra del focus sta in cima alla scheda e sostituisce «Showing X · Show all» nei Requisiti.
- Se la Proposal del focus esce da Backlog, il focus finisce e la scheda torna al Modello tenendo livello e posizione.
- Un livello aperto a mano senza elementi del focus si vede normale; la barra dice `– of N`.
- Un focus per scheda: non passa da una scheda all'altra.

## Scelte mie, da controllare

- `Clear` toglie evidenze e barra ma lascia disegnata la Proposal del focus, che il selettore continua a mostrare.
- Gli elementi attenuati restano cliccabili; selezionarli non toglie il focus.
- Un Task che nomina una sezione intitolata a un elemento (`requirements/ui#panel/Board`) evidenzia anche quell'elemento nel Diagramma, come fa lo scope di una Proposal.
- Limite dello zoom uguale a quello di `Fit`; attenuazione al 30% di opacità; ‹ e › disabilitati al primo e all'ultimo passo; con un solo passo niente contatore né frecce.
- I due pulsanti nuovi del Task stanno prima di `Run` e `Open`, con le icone della scheda Proposal.
- Ogni scheda (Diagramma, Requisiti, Specs) ha già il suo selettore di Proposal: `CHOOSE_DRAWN_PROPOSAL` ora vale per tutti e tre, e le ricadute di livello del Diagramma solo per il suo.
- Tooltip dei pulsanti View: `Show what <n> changes on the diagram` / `in Requirements` per una Proposal, `Show what <n> touches …` per un Task.
- Quando il quadro cambia, il focus resta sul passo che mostrava se esiste ancora, altrimenti torna al primo.
- Un chip `specs` (senza campo) evidenzia tutti i campi delle Specs.
- Esc toglie il focus solo se non c'è aperta una modale, tendina, fumetto o tooltip; altrimenti chiude prima quelli.
- Anche seguire un link a un solo elemento nel Diagramma adatta la vista a lui, invece che a tutto il livello.

## Dopo la scansione leggera del codice

- Esc nel Diagramma oggi deseleziona: con un focus, il primo Esc toglie la selezione e un secondo Esc toglie il focus (risposta del developer).
