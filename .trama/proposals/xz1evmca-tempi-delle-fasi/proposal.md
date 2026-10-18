---
status: approved
requires:
  - 4td4mzmg
base:
  requirements/rules/models.md: 36b2bd335b2042fde8adf7c83168d8945098b7101561d9b218b6e7c0262bcb80
  requirements/tech/models.md: 6b9a72e9a5c38fde5078d6ef91e18d4e0fbf82a949e5e4e903a330c5ce33db68
  requirements/data/proposals.md: edfe5c30fc1477a2927ddb9b68c6df6bba41bafd04c6082c4b10750470091e30
delete: []
created: 2026-10-18T19:52:24.838Z
label: Tempi delle fasi
---
# Tempi delle fasi

Perché: oggi Trama non registra quanto durano le fasi del lavoro dell'agente. Gli annunci tengono solo `touched` e si cancellano alla consegna, la History non ha tempi, e l'analisi che ha motivato le Proposal precedenti si è dovuta fare sui log delle sessioni di omp di un altro progetto. Senza misure non si può verificare se confronti più leggeri e coda continua danno davvero il guadagno atteso, né trovare il prossimo collo di bottiglia.

Decisioni prese nei round di domande:
- Un registro locale, non versionato, sotto `.trama/`, e un comando `trama timings` che riassume gli ultimi lavori; nessun cambio al pannello.
- Si misurano: le fasi dei controlli (pre-flight, verifica, scansione, History) con l'esito; ogni Task, da quando l'agente lo prende a quando è Done, chiuso senza modifiche o fermato da un Drift; ogni confronto di Machine, dal briefing all'archiviazione, con il numero di schede; le attese della coda, quando un posto è libero ma nessun Task può partire.

Scelte mie, da controllare:
- Le registrazioni le scrivono i comandi che già segnano questi passaggi (`announce`, `task move`, `drift new --task`, `compare brief`, `compare file`, `task next --batch`); nessun timer e nessun processo in più.
- Un lavoro, nel riassunto, va dall'annuncio di un pre-flight o di un controllo di scansione nello stesso terminale (o nella chat) fino al successivo.
- Si tengono gli ultimi 20 lavori; i più vecchi si cancellano alla scrittura.
