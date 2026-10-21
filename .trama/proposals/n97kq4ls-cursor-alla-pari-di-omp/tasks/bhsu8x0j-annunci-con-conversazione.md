---
refs:
  - announcement/Announced
  - requirements/data#announcement
  - requirements/tech#announcement
---
# Annunci con la conversazione

Un annuncio con `chat: cursor` porta nel front matter anche `conversation`, cioè l'identità della conversazione di Cursor a cui appartiene. Il campo manca quando la conversazione non è nota. Un annuncio con `chat` non ha mai `terminal`. Gli annunci scritti prima che il campo esistesse si leggono senza `conversation`. La lettura e la scrittura degli annunci in `src/core/announcements.ts` accettano il campo e lo conservano.

- **Provenienza.** `originFromEnv` (`src/core/announcements.ts`) restituisce, insieme a `chat: cursor`, la `conversation` presa da `TRAMA_CHAT` quando la variabile c'è. Così `trama announcement new`, e un `trama proposal new` che fa da sé il suo annuncio, copiano `terminal`, oppure `chat` più `conversation` quando c'è `TRAMA_CHAT`. Senza `TRAMA_CHAT` l'annuncio ha `chat` senza `conversation`, come oggi.
- **Presa del controllo di scan.** Con `phase: scanning`, `trama announcement new` non crea un annuncio quando esiste un controllo di scan di Trama (`source: request`) ancora in attesa che sia dello stesso terminale, della stessa conversazione, oppure con `chat` senza `conversation` se il comando arriva senza terminale né conversazione. In quel caso prende il più vecchio fra questi controlli, ne aggiorna `touched`, tiene il suo titolo e ne stampa l'ID. Il comando di una conversazione prende anche un controllo di Trama con `chat` e senza `conversation`, e gli scrive la sua `conversation`. Il controllo di un'altra conversazione non viene mai preso.
- **Annunci del lancio.** Al lancio nella chat, l'estensione scrive gli annunci (la Proposal di un design o di Resolve Drifts, il controllo di uno scan, il lavoro di un import) con `chat: cursor`, nello stesso momento di oggi, subito prima di `composer.createNew`. Quando poi l'host lega il lavoro di quell'istruzione alla sua conversazione (il legame del job alla chat, in `extension/src/host/drift-resolution.ts`), scrive `conversation` in quegli annunci se sono ancora in attesa. Se la consegna non arriva a `sent`, l'annuncio è cancellato senza avviso, come oggi.
- **Sincronizzazione del titolo.** La sincronizzazione del titolo con la Draft conserva anche `conversation`, oltre a identità, `kind`, `source`, `proposal`, `terminal`, `chat` e `touched`.
