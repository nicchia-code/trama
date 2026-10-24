---
column: done
technical: false
refs:
  - omp-chat-general
  - requirements/ui#omp-chat-general
  - requirements/rules#omp-chat-general
  - requirements/tech#omp-chat-general
  - requirements/data#omp-chat-general
drift: null
proposal: srkyrbvl
agent: false
created: 2026-10-24T10:27:31.669Z
finished: 2026-10-24T11:00:49.439Z
---
# Istruzione di General

La conversazione General di omp Chat riceve un'istruzione di Trama all'avvio di ogni sessione nuova, senza nessun messaggio e senza che compaia nella conversazione.

Quando è fatto:
- Testo: `extension/media/general.md`, in inglese, incluso nel VSIX con `media/**` come `ask-more.md`; non è una skill e non si installa nel progetto. Dice all'agente che è in General, la chat di Trama nella barra laterale dell'editor, aperta sulla cartella del progetto; che lì fa da assistente al developer, sul progetto e su Trama (Modello, Requisiti, Proposal, Task, Drift, Board); che per leggere e cambiare ciò che è di Trama usa la riga di comando `trama` e le skill di Trama installate nel progetto quando il developer chiede un lavoro che una skill copre; che non scrive mai a mano nei file di `.trama/`; il resto come in `rules#omp-chat-general`. Nessuna skill nominata come lavoro e nessuna frase delle istruzioni dei lavori (lingua, limite dei sotto-agenti, confronto con `trama-analysis`, Parallel Execution, Drift Blocker, Async Drift Resolver, Sub-agents Context Sharing, domande, auto exit).
- Processo (`extension/src/host/omp-chat/general.ts`): `<omp> [--model <m>] --append-system-prompt <file> acp [--yolo]`, con `<file>` il percorso assoluto di `general.md` nell'estensione di adesso, aggiunto dall'host a ogni avvio, ripresa compresa. Gli `args` salvati in `trama.ompChat.general` non portano `--append-system-prompt`. Nessun `session/prompt` all'avvio: General aspetta il developer.
- Verifica con omp 18.12.6 che `--append-system-prompt` prima di `acp` arrivi al prompt di sistema delle sessioni ACP (per esempio chiedendo all'agente di una sessione nuova che cosa è General); il risultato si annota in `docs/uat.md`. La scelta fra i due modi è una costante dell'host decisa dalla verifica, non un'impostazione.
- Ripiego, se l'opzione non arriva: l'opzione non si passa; l'host mette il testo di `general.md` in testa al primo `session/prompt` di ogni sessione nuova, come blocco di testo `Instructions from Trama (not written by the developer):` seguito dal testo, e un blocco `Developer's message:` seguito dal messaggio del developer, con la stessa funzione di `extension/src/host/prompts.ts` che usa Ask more (Task `Ask more vuota`). Dopo, la voce salvata `trama.ompChat.general` (`workspaceState`) ha `instructed: true`; assente altrimenti. Una General ripresa con `instructed: true` non manda di nuovo l'istruzione; una sessione nuova (dopo pulizia, ripresa fallita o `SESSION_NOT_RESUMED`) la manda di nuovo.
- Vista: l'istruzione non compare mai in General: nessun messaggio con l'etichetta `Trama`, nemmeno nel ripiego, dove il primo messaggio si mostra come il developer l'ha scritto.
- General segue la scelta `Steer | Queue` condivisa con le altre conversazioni, come la implementa il Task `Steer e Queue`; nel suo campo c'è l'interruttore accanto a `Send` e `Stop`.
- Il resto di General non cambia (avvio, pulizia, errori, ripresa, `Kept after switch-off`).
- Test: un test dell'host con un client ACP finto prova gli argomenti con `--append-system-prompt` e il percorso assoluto, gli `args` salvati senza l'opzione e, nel modo di ripiego, l'istruzione unita al primo messaggio di una sessione nuova, `instructed` e nessun nuovo invio dopo la ripresa.
