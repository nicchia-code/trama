---
status: approved
base:
  requirements/ui/panel.md: 839127f54c2b206268dc0d2f91f6ebd2f2463aa5f4258f0d37c207bea472c771
  requirements/ui/settings-specs.md: new
delete: []
created: 2026-10-16T09:34:25.344Z
---
# Specs: voci affiancate come in Settings

La scheda Specs usa una sola colonna stretta (al massimo ~980 px) e lascia vuoto lo spazio orizzontale dei pannelli larghi; Settings invece affianca le impostazioni in una griglia. Le Specs adottano lo stesso schema.

Decisioni:
- Ogni campo resta un gruppo a tutta larghezza, uno sotto l'altro; le sue voci si affiancano in una griglia di colonne di pari larghezza, come in Settings.
- La pagina si allarga con il pannello fino a ~1100 px, come Settings.
- Colonne larghe almeno ~300 px; vanno a capo fino a una colonna sola nei pannelli stretti.
- Il campo Notes, testo libero, occupa tutta la larghezza della pagina.
- Le voci di una riga partono dall'alto con la loro altezza; le teste stanno alla stessa altezza.
