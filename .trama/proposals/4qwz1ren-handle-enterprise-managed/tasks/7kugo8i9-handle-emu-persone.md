---
technical: false
refs:
  - person
  - developer.EDIT_PERSON
  - requirements/rules#person
---
# Handle EMU nelle persone

Il campo `GitHub handle` di una persona (aggiunta dalla scheda People della vista Team e modificata con `developer.EDIT_PERSON`) accetta anche gli handle di GitHub Enterprise Managed Users, della forma `<nome>_<shortcode>`, per esempio `32984238_EYGS`.

Quando il Task è finito:

- Un handle è valido quando ha da 1 a 39 caratteri in tutto ed è fatto di lettere, cifre e trattini singoli, senza trattino iniziale o finale, seguito facoltativamente da un `_` e da uno shortcode di lettere e cifre. `32984238_EYGS`, `octocat`, `octo-cat_acme` sono validi; `_acme`, `octocat_`, `octo_cat_acme`, `octo-_acme`, `octocat-` e un handle di 40 caratteri non lo sono.
- Un handle non valido senza spazi riceve `Use 1 to 39 letters, digits, single hyphens and an optional _shortcode.`; un handle con uno spazio riceve ancora `A GitHub handle can't contain spaces.`; la `@` iniziale scritta dal Manager si toglie come prima; due persone non possono avere lo stesso handle confrontato senza maiuscole, anche con il suffisso.
- La stessa regola vale ovunque Trama controlla un handle già salvato: una persona salvata con un handle EMU viene letta, mostrata, offerta in `Add from other projects` e restituita da `trama team show` come le altre.
- Il codice è `HANDLE`, `handleError` e `PERSON_MESSAGES.handle` in `src/core/people.ts`; i test che fissano il formato e il messaggio vanno aggiornati, con almeno un caso EMU valido e i casi non validi sopra.
