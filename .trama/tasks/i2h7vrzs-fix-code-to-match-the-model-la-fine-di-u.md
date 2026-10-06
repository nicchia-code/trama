---
column: done
technical: false
refs:
  - notice
  - requirements/rules#notice
drift: 01vs0gpq
proposal: null
agent: false
created: 2026-10-06T18:57:09.954Z
finished: 2026-10-06T19:09:58.193Z
---
# Fix code to match the Model: La fine di un terminale sostituito non genera il proprio avviso

## What happens

Quando Trama avvia un secondo terminale mentre il primo lavora, la fine del comando nel primo non genera alcun avviso. Solo il terminale seguito per ultimo può annunciare la propria fine. Due comandi conclusi in due terminali distinti producono quindi un solo avviso, anche quando entrambe le conclusioni avvengono dopo l'ultima istruzione e nessuna nuova istruzione annulla l'attesa. La stessa esclusione riguarda le finestre esterne sostituite.

## What should happen

Ogni comando scritto da Trama che termina nel proprio terminale deve generare il suo avviso se l'argomento è impostato in quel momento. Due comandi che terminano in due terminali diversi devono generare due avvisi. Una nuova istruzione realmente inviata annulla gli avvisi sulla fine già in Waiting, ma non deve impedire la nascita di quelli relativi a comandi che terminano successivamente.

## Chosen option

**Avvisare per ogni terminale che conclude il comando**

Mantenere ogni terminale avviato da Trama idoneo a generare il proprio avviso quando termina il comando scritto da Trama, anche dopo l'apertura di un altro terminale. Le istruzioni nuove continuano ad annullare soltanto gli avvisi già in attesa. Si preservano esito e conteggi di ogni conclusione, al costo di poter ricevere più avvisi per lavori paralleli.

## Where in the code

extension/src/host/agent.ts: watchAgentTerminal e watchExternalRuns; extension/src/host/external-terminal.ts: ExternalRuns
