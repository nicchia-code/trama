---
status: resolved
resolution: proposal
refs:
  - drift-resolution
  - requirements/rules#drift-resolution
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: i0e2coiq
created: 2026-10-10T08:44:21.900Z
---
# Read-only commands restart the quiet period of a non-Cursor chat run

## What happens

Ogni comando di Trama lanciato dall'agente nella chat di un editor che non è Cursor fa ripartire la quiete del lavoro, anche quando si limita a leggere lo stato. Così un agente della chat che legge soltanto non viene mai dato per finito, anche dopo molto tempo fermo.

## What should happen

Nella chat di un editor che non è Cursor solo i comandi che cambiano qualcosa fanno ripartire la quiete: un agente che legge soltanto per quindici minuti è dato per finito. I comandi che leggono soltanto non contano.

## Fix options

### Ignorare i comandi che leggono soltanto nella chat

Il segnale di attività nella chat di un editor che non è Cursor ignora i comandi di sola lettura, come prescrive il Modello. Il lavoro si chiude dopo quindici minuti di sola lettura, e un agente che sta ancora leggendo può essere considerato finito e far riabilitare Resolve Drifts o i Run prima del tempo. Costo: una riga di codice in meno nell'attività della chat, nessun altro cambiamento.

### Contare anche la lettura nella chat, cambiando il Modello

Si lascia il codice com'è e si cambia il Modello: nella chat di un editor che non è Cursor anche i comandi di sola lettura fanno ripartire la quiete. Il lavoro resta in corso finché l'agente interroga Trama, ma un agente fermo che legge ogni tanto non finisce mai per la quiete. Costo: una decisione di Modello e Requisiti da approvare.

## Where in the code

extension/src/host/questions.ts (onActivity); extension/src/host/drift-resolution.ts (noteActivity)
