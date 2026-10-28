---
status: resolved
resolution: proposal
refs:
  - project/Trama project/developer.REWRITE_IDENTITIES
  - requirements/rules#General
  - requirements/tech#agent-terminal
  - requirements/cli#General
proposal: null
task: null
origin: q2obxm4y
option: null
note: null
resolvedBy: ogv9l141
created: 2026-10-27T08:02:19.747Z
job: e7aad08e-67a5-49fc-80ab-9e0ac53988d4
---
# Riscrittura identità: Model contro docs

## What happens

Il Model prevede che il developer dia un'identità permanente a ogni Proposal, Task e Drift ancora numerato con un comando, e due Requisiti (`rules#General`, `tech#agent-terminal`) lo nominano ancora fra i comandi di decisione. Il Requisito `cli#General`, la documentazione dei comandi e il registro delle modifiche dicono invece che il comando è stato **tolto di proposito e senza sostituto**: le schede ancora numerate restano leggibili ma non si convertono più. Nel codice il comando non esiste.

## What should happen

Il Model e i Requisiti dovrebbero dire una cosa sola. Se il comando esiste (Model), il codice deve implementarlo e il Requisito `cli#General` e la documentazione vanno corretti; se è stato tolto (documentazione), il Model e i due Requisiti vanno corretti. Un'implementazione del comando contraddirebbe `cli#General`, quindi nessuna correzione del codice rispetta insieme Model e Requisiti: la scelta è del developer. La Proposta allegata toglie il comando dal Model e dai due Requisiti, in linea con documentazione e codice; se il developer vuole tenerlo, la rifiuta.

## Where in the code

src/cli (nessun comando `ids rewrite` nel registro dei comandi); docs/cli.md e CHANGELOG.md (comando dichiarato rimosso); .trama/model/project-setup/project.md e .trama/model/actors/developer.md (REWRITE_IDENTITIES); .trama/requirements/cli/main.md, rules/general.md, tech/agent-terminal.md

## Prepared question

```json
{
  "question": {
    "id": "41tpljc1",
    "question": "Il comando per riscrivere le identità delle schede numerate resta nel Model o va tolto?",
    "context": "Il Model e due Requisiti (le regole generali e il terminale dell'agente) descrivono il comando del developer che dà un'identità permanente a ogni Proposal, Task e Drift ancora numerato. Il Requisito generale della riga di comando, la documentazione dei comandi e il registro delle modifiche dicono invece che il comando è stato tolto di proposito e senza sostituto: le schede ancora numerate restano leggibili ma non si convertono più. Nel codice il comando non esiste. Implementarlo contraddirebbe il Requisito della riga di comando, quindi nessuna correzione del codice rispetta insieme Model e Requisiti: la scelta è del developer.",
    "options": [
      {
        "label": "Togliere il comando dal Model e dai Requisiti",
        "description": "La Proposal allegata rimuove la transizione e il suo Evento, e i due Requisiti smettono di nominare il comando.",
        "details": "Allinea Model e Requisiti a documentazione e codice, senza lavoro sul codice. I comandi di decisione eseguibili dall'agente scendono da sette a sei. Le schede ancora numerate non si convertono più."
      },
      {
        "label": "Chiudere senza cambiare nulla",
        "description": "Nessuna modifica al Model e ai Requisiti: la contraddizione con la documentazione resta.",
        "details": "Il Drift si chiude, ma il Model continua a prevedere un comando che il codice non ha e che la documentazione dice rimosso. Il rischio è che la stessa differenza venga segnalata di nuovo da una prossima scansione."
      }
    ],
    "recommended": 0,
    "multi": false
  },
  "decisions": [
    {
      "decision": "proposal"
    },
    {
      "decision": "dismissed"
    }
  ],
  "fingerprint": "c986a008826c9c0c8fe40ad3f6ecc218f5e806912dfe4ebf134215c3d30660ab",
  "prepared": "2026-10-27T09:55:07.950Z"
}
```
