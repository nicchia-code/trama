---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#editor-chat
proposal: null
task: cfxda7vs
origin: null
option: 1
note: null
resolvedBy: 8xo36qli
created: 2026-10-21T12:00:44.531Z
job: f4a36957-8799-41b0-a4ab-7cc0d2fd93cc
---
# Prefisso identità su righe composte

## What happens

Per una riga di shell con più comandi (per esempio `cd x && trama model show`) l'hook della chat antepone **`export TRAMA_CHAT=…; `** a tutta la riga. Per una riga con un solo comando usa il prefisso letterale. Quindi le variabili restano nella shell della sessione di Cursor dopo il comando.

## What should happen

Il Requirement dice che il comando è **preceduto da `TRAMA_CHAT=<conversazione> TRAMA_JOB=<lavoro> `**, e che completare un comando non deve cambiare altro. Il prefisso letterale vale solo per il primo comando di una riga composta, quindi `trama` dopo `&&` perderebbe l'identità: il Requirement non dice come trattare questo caso.

## Fix options

### Prefisso su ogni invocazione

Anteporre il prefisso letterale a ogni invocazione di `trama` della riga, non solo alla prima. Rispetta il Requirement e non lascia variabili nella shell. Costa un riconoscimento più preciso delle invocazioni nella riga composta.

### Solo righe semplici

Completare solo le righe con un'unica invocazione di `trama`; le righe composte restano senza identità e il comando registra come chat senza conversazione. Semplice e letterale, ma perde l'identità proprio nei casi composti.

## Where in the code

src/core/cursor-chat.ts, completamento del comando nell'hook preToolUse Shell (`test/cursor-chat.test.ts`).
