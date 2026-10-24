---
status: approved
base:
  agent-launching/omp-chat-general.md: cca1ffc53645a2aee893263fc57f13b65e04be63061565b4a7cbf099680974ae
  requirements/rules/omp-chat-general.md: 2db59196c08193ecb7ea6b732f283f556bc4f6f9d03f806964fc313cc87389c2
delete: []
created: 2026-10-24T13:14:39.241Z
label: General brainstorming
---
# General per il brainstorming

Oggi l'istruzione di General dice all'agente di usare la riga di comando `trama` e le skill di Trama «quando il developer chiede un lavoro che una di esse descrive»: l'agente legge un desiderio o un problema come una richiesta e parte da solo, per esempio aprendo Proposal. General deve essere uno strumento di brainstorming: ragiona con il developer e scrive solo quando glielo si ordina.

## Decisioni

- Solo su richiesta esplicita: ogni comando `trama` che scrive (Proposal, Task, Drift, History, confronti, annunci…), ogni modifica ai file del progetto e ogni commit.
- Richiesta esplicita è solo un ordine diretto che nomina l'azione («apri una Proposal», «togli T3», «correggilo»); un desiderio, un problema o un'idea non bastano mai.
- Quando il ragionamento arriva a qualcosa da mettere per iscritto, l'agente chiude la risposta con una riga che nomina il passo possibile (per esempio una Proposal) e non fa nulla finché non gli viene chiesto.
- L'agente legge liberamente, senza chiedere, Modello, Requisiti, schede e codice, con comandi e strumenti di sola lettura.
- Durante il brainstorming fa le domande nella chat; i round di domande di Trama solo dentro un lavoro chiesto esplicitamente (per esempio un design).

## Assunzioni da verificare

- Un ordine esplicito vale per l'azione che nomina e per ciò che la skill di quel lavoro richiede per completarla (per esempio i file e i Task di una Proposal), non per altre azioni.
- Le regole di prima restano: nessuna scrittura a mano in `.trama/` e nessuna decisione del developer (approvare, rifiutare, scartare, risolvere) senza la sua richiesta esplicita.
