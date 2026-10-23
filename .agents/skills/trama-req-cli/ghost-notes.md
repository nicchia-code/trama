# Requirements: Riga di comando, Note dei ghost

Usa quando lavori al comando con cui l'agente dichiara una nota su un ghost.

## agent.DECLARE_ANNOUNCEMENT_NOTE

- `trama announcement edit [<id>]` con `{ note }`: `note` è una stringa obbligatoria. Con `<id>` scrive la nota su quell'annuncio; senza, sugli annunci che `rules#agent.DECLARE_ANNOUNCEMENT_NOTE` indica. L'uscita, una riga per annuncio, dice a quali annunci è andata (identità e titolo) e, quando c'è, che la nota è stata troncata; senza annunci dice «No announcement is waiting here; the note was not saved.». Con `--json`: `{ announcements: string[], truncated: boolean }`. Esito 0 anche quando la nota non va a nessun annuncio; 2 per un input non valido; 1 per un'identità sconosciuta.
- Il comando non conta come attività dell'agente, e non contatta l'editor: l'editor vede la nota dal file dell'annuncio, come ogni altro cambiamento.
- `--help` mostra il campo, un esempio e l'uscita; `docs/cli.md` si rigenera.
