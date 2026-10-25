---
created: 2026-10-25T12:26:46.148Z
updated: 2026-10-25T12:26:46.148Z
summary: Il rifiuto di una Proposal ritira subito l'annuncio legato, senza ghost né avviso a fine job; il raffinamento non mostra mai la Proposal come ghost, nemmeno dopo Remove.
tasks:
  - y4abgx83
  - c4t7m175
---
# Rifiuto e raffinamento senza ghost

Il rifiuto di una Proposal, del developer o di Remove durante un raffinamento, ritira nello stesso passo l'annuncio legato a quella Proposal e nessun altro. Lo Snapshot non produce mai un ghost per un annuncio legato a una Proposal che non è più una Draft, così fra il rifiuto e la fine del job non compare alcun ghost. Il raffinamento non mostra la Proposal raffinata come ghost in nessun momento: Open prima del rebase, Draft con refining, giro di domande e dopo Remove. Alla fine del job di un raffinamento concluso con Remove non resta nulla da ritirare e non viene preparato alcun avviso.
