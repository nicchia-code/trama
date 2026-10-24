---
refs:
  - omp-chat-conversation
  - requirements/rules#omp-chat-conversation
  - requirements/tech#omp-chat-conversation
  - requirements/data#omp-chat-conversation
  - requirements/quality#omp-chat-conversation
---
# Intent Tracing nelle conversazioni

Ogni conversazione di omp Chat (di qualunque lavoro, Quick Task e Ask more compresi) parte con l'Intent Tracing di omp acceso o spento secondo l'impostazione `trama.ompChatIntentTracing` (acceso per default; spento solo con il valore utente `false`, un altro Task la dichiara).

- All'apertura di una conversazione l'host legge l'impostazione e mette nell'ambiente del processo di omp `PI_INTENT_TRACING=1` (acceso) o `PI_INTENT_TRACING=0` (spento). La variabile in omp prevale su `tools.intentTracing` della configurazione dell'utente e del progetto e su ogni overlay `--config`: l'overlay condiviso dei lanci (`launch.yml`) non cambia. Spenta, l'agente non scrive più le frasi d'intento e le righe delle chiamate mostrano il titolo che omp dà allora alla chiamata; la vista non cambia nulla da sé.
- `PI_INTENT_TRACING` entra fra le variabili salvate per la ripresa (`SAVED_ENV_KEYS`, voce `env` di `trama.ompChat.conversations`): una conversazione ripresa dopo una ricarica riparte con il valore con cui era partita, anche se nel frattempo l'impostazione è cambiata. Una voce salvata prima di questo cambiamento, senza la variabile, riparte senza, cioè con la configurazione di omp. Un cambio dell'impostazione non tocca le conversazioni aperte.
- Solo i processi di omp Chat ricevono la variabile: i terminali di omp, compreso quello di ripiego quando una conversazione non parte, e le sessioni di omp avviate a mano seguono la configurazione di omp.
- Sicurezza: l'impostazione si legge solo dalle impostazioni utente.
- Va verificato con omp (18.12 o la versione installata) che `PI_INTENT_TRACING=0` spenga davvero l'Intent Tracing in una sessione `omp acp`, e com'è allora il titolo delle chiamate in ACP.
