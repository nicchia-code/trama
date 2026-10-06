---
column: done
technical: false
refs:
  - announcement/Announced
  - announcement/Announced/time.QUIET_PERIOD_ELAPSED
  - requirements/rules#announcement
  - requirements/tech#announcement
drift: null
proposal: null
agent: false
created: 2026-10-06T15:36:23.931Z
finished: 2026-10-06T15:39:26.367Z
---
# Mostrare e ritirare anche gli annunci fatti dagli agenti nei worktree

Un agente che lavora nel terminale di un worktree (scansione o Task del giro) annuncia le sue schede come ogni altro agente, ma oggi l'annuncio resta nella copia del worktree: la Board della cartella aperta non ne mostra il ghost, il quarto d'ora di quiete non lo ritira mai e l'avvio dell'editor non lo trova. Alla fine del comando viene ritirato con l'avviso di un ghost che il developer non ha mai visto.

Quando è fatto:
- finché è in Announced, l'annuncio di un agente in un worktree ha il suo ghost sulla Board, nella colonna in cui arriverà la scheda, come le schede di quel worktree che la Board già mostra;
- quindici minuti senza attività ritirano, con l'avviso, anche gli annunci ancora in attesa nei worktree ("qualunque terminale"), con la stessa sospensione durante un round di domande;
- all'avvio l'estensione ritira senza avviso anche gli annunci rimasti nei worktree;
- la consegna, la fine del comando e la chiusura del terminale del worktree continuano a valere come oggi.
