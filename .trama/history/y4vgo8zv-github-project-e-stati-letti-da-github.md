---
created: 2026-10-25T18:29:08.417Z
updated: 2026-10-25T18:29:08.417Z
summary: Trama collega un GitHub Project alla copia di lavoro e lo legge solo in lettura con gh, all'apertura della vista Team e con Refresh; dalle letture ricava lo stato di ogni issue pubblicata.
tasks:
  - bqbxbb5f
  - 4nvuldia
---
# GitHub Project e stati letti da GitHub

Con la GitHub CLI Trama legge Project, campi e iterazioni; non sono previsti comandi che scrivono. Il collegamento si sceglie, cambia e toglie (Unlink) dalla vista Team. La vista guida gli errori: gh mancante, login con gh auth login, accesso ai Project con gh auth refresh, errore di lettura. `trama issue fields` stampa campi e iterazioni del Project. Dopo la pubblicazione Trama calcola lo stato di ogni issue (Open, In progress, In review, Closed, Not planned, Not found on GitHub) da una query paginata sugli item del Project; sprint, stima e assegnatario sono quelli letti da GitHub. Il briefing dei confronti aggiunge la sezione Published issues.
