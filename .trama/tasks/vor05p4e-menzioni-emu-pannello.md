---
column: done
technical: false
refs:
  - panel
  - requirements/ui#panel
drift: null
proposal: 4qwz1ren
agent: false
created: 2026-10-25T20:07:15.240Z
finished: 2026-10-25T20:09:02.529Z
---
# Menzioni EMU nel pannello

Nel Markdown del pannello (e quindi anche in omp Chat e nell'anteprima delle issue di un handoff, che usano lo stesso renderer), `@<handle>` con il suffisso `_shortcode` di GitHub Enterprise Managed Users diventa un link al profilo GitHub dell'utente, come gli altri handle.

Quando il Task è finito:

- Dopo una `@` che inizia una parola, il nome utente riconosciuto ha la stessa forma del campo `GitHub handle` delle persone (`rules#person`): lettere, cifre e trattini singoli, senza trattino iniziale o finale, con un suffisso facoltativo `_` più lettere e cifre, 39 caratteri al massimo in tutto. `@32984238_EYGS` diventa un link a `https://github.com/32984238_EYGS`, e la riga `**Reviewer:** @32984238_EYGS` dell'anteprima mostra il revisore come link.
- Tutto il resto delle regole resta com'è: link solo quando il repository del progetto è su GitHub; testo semplice dentro il codice inline e i blocchi di codice; una `@` dentro un indirizzo email non è mai un riferimento; un nome seguito da un altro carattere di parola, da un secondo `_` o da `--` non è un riferimento.
- Il codice è il riconoscimento del nome utente nel renderer Markdown condiviso (`extension/src/webview/markdown.tsx`, il ramo dei riferimenti `@`); i test del renderer coprono un handle EMU che diventa link e un nome con due `_` che resta testo.
