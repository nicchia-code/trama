---
status: approved
base:
  requirements/tech/agent-terminal.md: 19c0ed2975f4b4fdee9f5d58bd209822b44f86361e5f82bdae186c0ae8b3c0fe
  requirements/tech/general.md: d9d55617f2457171cad0122230f1112f3ea50cb8361d5dc5c98630d09ac470ee
delete: []
request: 2026-10-20T10-27-46
created: 2026-10-20T09:12:45.070Z
label: Citazione PS 5.1
---
# Citazione PowerShell 5.1

La release Windows non si pubblica: su `windows-latest` fallisce il test che esegue le righe dell'agente in Windows PowerShell 5.1. La regola di citazione di 5.1 per le virgolette dispari non raddoppia la barra davanti a una virgoletta (`x"y z\` arriva diviso), e la scelta pari/dispari sul totale delle virgolette lascerebbe dividere anche il JSON compatto di `--settings` e `--agents`. Inoltre due run della release si sono bloccati per ore su Linux e macOS nei test di `trama compare`.

Decisioni:
- In Windows PowerShell 5.1 ogni argomento si scrive sempre fra virgolette doppie, con le virgolette interne raddoppiate, le barre davanti a una virgoletta e quelle finali raddoppiate: una regola sola, valida per i programmi che leggono la riga con le regole del C runtime dal 2008 (Node, Bun ≥ 1.4, MSVC); chi legge con `CommandLineToArgvW` (Bun ≤ 1.3) non è supportato.
- I test di citazione su Windows leggono ogni riga sia con un programma Bun sia con `node`, e hanno un caso di JSON compatto come quello di `--settings`.
- Ogni job del workflow della release ha un limite di 15 minuti; il test che si blocca su Linux e macOS si trova e si corregge.
- Dopo la correzione il developer rifà a mano la release `v0.0.7` (cancella release e tag, spinge di nuovo il tag sul commit corretto): non è un Task.
