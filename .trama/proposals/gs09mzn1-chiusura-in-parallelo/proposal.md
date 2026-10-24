---
status: approved
requires:
  - 9l43viwa
base:
  work/task.md: c1dca5008ae29da0284ef8474b12c738922b8359f6a1aac9101ffd311b5b73c6
  work/voce-history.md: a29a146c65513f7bf377864da5f31c5689cef637de88d424bb35feab8b17901c
  work/announcement.md: 3ae6cf64ec9f37aa47a012f8dffe0b92b0fcf130d88a5c70045ab900786f0e8d
  requirements/tech/history.md: d3b4ca93f8415788f3358071cdabd6ae5038a5bf8dd588c7c4b9487a5a431c03
  requirements/tech/chiusura.md: new
delete: []
created: 2026-10-24T08:08:07.673Z
label: Chiusura veloce
---
# Chiusura in parallelo

Nei Run misurati la chiusura, dall'ultimo Task alla fine del Run, vale il 16% del tempo: l'agente principale esegue test, controllo dei tipi e build uno dopo l'altro, poi legge la History e scrive le voci. Le voci di History non dipendono dall'esito della verifica (si scrivono anche quando fallisce), quindi si possono preparare mentre la verifica gira; e i controlli che non dipendono l'uno dall'altro possono girare insieme.

## Decisioni

- Un sotto-agente prepara il testo delle voci di History mentre l'agente principale esegue la verifica; l'agente principale registra le voci dopo, nella fase History, come oggi.
- Test, controllo dei tipi e build girano insieme quando non dipendono l'uno dall'altro.
- Le fasi del controllo sulla Board restano quelle di oggi: Verifying, poi l'eventuale Scanning, poi History.

## Assunzioni da verificare

- Il sotto-agente della History non scrive nulla: legge la History con i comandi di Trama e torna con le voci da scrivere o aggiornare, pronte da passare a `trama history new` o `trama history edit`; è l'agente principale a lanciarli e a rispondere dei loro rifiuti.
- Vale per ogni Run che ha portato almeno un Task in Done senza `unchanged` e quando l'agente ha sotto-agenti, con o senza Parallel Execution; senza sotto-agenti l'agente lavora come oggi.
- Se la verifica fallisce e l'agente corregge il codice, il testo preparato resta valido: racconta i Task, non l'esito della verifica.
- Due controlli dipendono l'uno dall'altro quando uno usa ciò che l'altro produce o scrive gli stessi file; nel dubbio girano uno dopo l'altro.
