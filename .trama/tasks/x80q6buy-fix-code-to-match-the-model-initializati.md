---
column: done
technical: false
refs:
  - project/Not a Trama project/developer.INITIALIZE_PROJECT
  - requirements/rules#project
  - requirements/tech#agent-launching
drift: r72wjye7
proposal: null
agent: false
created: 2026-10-10T07:51:07.263Z
finished: 2026-10-10T07:53:01.970Z
---
# Fix code to match the Model: Initialization overwrites customised omp sub-agent definitions without asking

## What happens

L'inizializzazione controlla i conflitti **solo sui file delle skill**. Le due definizioni dei sotto-agenti di omp (`trama-triage.md` e `trama-analysis.md` nella cartella degli agenti del progetto) vengono scritte **sempre, sostituendo una copia già presente** anche se il developer l'ha personalizzata: nessun rifiuto, nessuna conferma nel dialogo modale, nessuna menzione fra i file in conflitto. Lo stesso accade con l'inizializzazione dall'editor, che chiede conferma solo per le skill. Il resoconto dice solo che le definizioni sono state installate.

## What should happen

Il Model dice che all'inizializzazione, se un file dell'agente installato da Trama esiste già con contenuto diverso, **non si crea nulla finché il developer non conferma** la sovrascrittura; i file identici non sono un conflitto. I Requisiti (`rules#project`) applicano il rifiuto ai file delle skill da installare ed elencano solo le skill; `tech#agent-launching` dice che l'inizializzazione installa le due definizioni, senza dire se valgono come conflitto. Il Model non decide esplicitamente il caso delle definizioni dei sotto-agenti: per la regola generale, un file personalizzato non va distrutto senza conferma.

## Chosen option

**Contare le definizioni fra i conflitti dell'inizializzazione**

Le due definizioni di omp entrano nel controllo dei conflitti: se una esiste con contenuto diverso, l'inizializzazione rifiuta senza creare nulla e la elenca, e l'editor chiede la stessa conferma modale delle skill. Costa poco codice; l'aggiornamento delle skill continua a sostituirle. I Requisiti vanno precisati per nominare le definizioni.

## Where in the code

`src/cli/commands.ts` (comando `init`: il controllo dei conflitti precede l'installazione delle skill e non copre le definizioni); `src/cli/skills.ts` (`installOmpAgents` scrive senza controllo); `extension/src/host/project.ts` (`initializeProject`, conferma modale solo per le skill).
