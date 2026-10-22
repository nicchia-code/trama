---
status: approved
requires:
  - q51924cv
  - 165u7rro
base:
  agent-launching/design-request.md: 562d90ef07856fde39f51f8c91d6318ce01942c92caa20a446c926c9dc55db1e
  work/task.md: 218bd0798fbcd6c0bfc9fb6d6708670b7f5fd1e7adb3aaa43bf5a3770896f04e
  model-changes/proposal.md: fd0d609c932219e0d959566104e45babe5288d6b50141976ce249a66571a5faa
  editor-panel/panel.md: 6f022807320adb5802979cbd1e3dbfeca2c3b89b557f11e7d858197cb04bec1e
  requirements/rules/requests.md: d57319580ea5029964aaf399a5f036f2770f4c20181ea04f6a866e182bd15e59
  requirements/tech/requests.md: 1b5a3e48cc81414f78c6544229955dc05720501f61cdbb25381c4a59835e56cc
  requirements/data/work.md: 7826bcfdeb7c8b4147fb8cc2f7480ab77115bdc459f2149c34dda75a69e48cc3
  requirements/ui/tasks.md: 30ac204edc2e5b75cb52e8b7b07af7e5ae6d42495f94063cd8c5e5fb05d7d3a6
  requirements/ui/history.md: new
  requirements/cli/main.md: feae3b02886af897b88bb43443e202412c5f52215e5f3c2ccb2f681c12940c27
delete: []
created: 2026-10-22T05:34:02.756Z
label: Immagini ai Task
---
# Immagini all'esecuzione

Le immagini di una richiesta scritta possono arrivare anche al modello che realizza i Task: l'agente di design chiede al developer se mandarle e, se sì, le lega ai Task che riguardano, così il Run le passa al sotto-agente che lavora su quel Task.

## Decisioni

- Vale per le richieste di design e per quelle di setup, ogni volta che hanno almeno un'immagine.
- Una sola domanda, nel primo round dell'intervista, per tutte le immagini: no → si procede come oggi; sì → tutte le immagini vanno all'esecuzione, senza scelta per immagine.
- Ogni immagine è legata ai Task a cui serve, non a tutti.
- Le immagini legate ai Task stanno in una cartella locale di `.trama/`, ignorata da git, come le richieste.
- Si cancellano quando il Task finisce (Done o chiuso senza modifiche).
- I dettagli di un Task (scheda in Active e sezione Tasks dei dettagli di una Proposal nel Diagramma) mostrano le anteprime; un clic apre l'immagine intera in una scheda dell'editor.

## Assunzioni da controllare

- Solo le immagini che sono file locali (nella cartella della richiesta o nel progetto) possono andare all'esecuzione; quelle collegate da un indirizzo web restano solo contesto del design.
- Le immagini si cancellano anche quando il Task non nascerà più (Proposal rifiutata o scartata, Task tolto dalla Proposal); una Proposal rifiutata con Rework with feedback le tiene finché la Proposal che la rifà non è consegnata, così l'agente può legarle ai Task nuovi.
- All'attivazione l'estensione cancella le immagini rimaste senza un Task che le tenga, come fa con le cartelle delle richieste.
- La raccomandazione della domanda la sceglie l'agente guardando le immagini; una domanda saltata vale la raccomandazione.
- Il testo di Proposal, Modello, Requisiti, Specs e Task continua a non copiare, collegare o citare le immagini: il legame passa solo da Trama.
