---
column: todo
technical: false
refs:
  - agent-terminal
  - requirements/tech#agent-terminal
drift: null
proposal: llcktsts
agent: false
created: 2026-10-20T12:28:14.678Z
---
# Citazione PowerShell 5.1

Quando il Task è fatto, in Windows PowerShell 5.1 ogni argomento della riga dell'agente (istruzione, percorsi, `--model`, il JSON di `--settings` e `--agents`) si scrive con una regola sola, qualunque testo contenga: fra virgolette doppie, con ogni virgoletta doppia interna raddoppiata (`""`), le barre rovesciate subito prima di una virgoletta e quelle in fondo raddoppiate, poi come stringa PowerShell fra apici singoli. Le vecchie strade per testi senza spazi, con virgolette pari o dispari spariscono, e il commento della funzione descrive la regola nuova: PowerShell 5.1 avvolge un argomento fra virgolette sue solo quando uno spazio ha prima un numero pari di virgolette, e con questa regola non succede mai.

Il programma riceve il testo intatto, anche `x"y z\` (oggi diviso in `x"y` e `z\`) e un JSON compatto con spazi solo dentro le stringhe come quello di `--settings`. PowerShell 7 e Git Bash non cambiano.

I test di citazione eseguono davvero ogni riga in Windows PowerShell 5.1, PowerShell 7 e Git Bash su `windows-latest` e la fanno leggere sia da un programma Bun sia da `node`; fra i casi ci sono un JSON compatto come quello di `--settings` e `x"y z\`. Su Linux e macOS girano con `sh` come oggi. Il test `Windows PowerShell 5.1 hands each agent command argument to the program intact` passa su `windows-latest`.
