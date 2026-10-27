---
column: done
technical: false
refs:
  - checkout
  - user
  - user.ADD_ITEM
  - user.CHECKOUT
  - cart
drift: null
proposal: 7s3p85ou
agent: false
created: 2026-10-26T19:06:35.770Z
finished: 2026-10-26T19:06:40.423Z
---
# Carrello

Il cliente riempie un carrello di libri e lo conferma.

Alla fine vale questo:
- Ogni ordine ha il suo carrello, che nasce in `Empty`.
- `user.ADD_ITEM` porta il carrello in `Has items`, anche quando ne è già in; lo stesso libro aggiunto due volte aumenta la quantità di una riga invece di crearne un'altra.
- `user.CHECKOUT` da `Has items` porta il carrello in `Confirmed` ed emette `CONFIRM` con le righe scelte. Da `Empty` non succede nulla: un carrello vuoto non si conferma.
- Un carrello `Confirmed` non accetta più libri.
- Gli importi sono in centesimi, come chiede `requirements/data`.
