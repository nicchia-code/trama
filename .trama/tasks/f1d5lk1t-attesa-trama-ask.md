---
column: done
technical: false
refs:
  - question-round
  - requirements/tech#question-round
drift: null
proposal: v3vw3m0r
agent: false
created: 2026-10-18T09:05:25.881Z
finished: 2026-10-18T09:13:40.304Z
---
# Attesa di trama ask

Nelle skill `trama-design`, `trama-import` e `trama-resolve-drifts` (sorgenti in `skills/`), la riga «**Wait for `trama ask` to finish**» della sezione sulle domande oggi dice solo che, se Cursor sposta `trama ask` in background dopo 30 secondi, l'agente deve continuare ad aspettarne il risultato senza ripeterlo. A Task concluso quella riga dice invece come aspettare.

L'agente lancia `trama ask` con l'attesa predefinita. Se Cursor sposta il comando in background, l'agente aspetta solo la fine di quel comando con lo strumento di Cursor che attende un comando in background (`AwaitShell` sull'id del comando), che ritorna appena il comando finisce, e legge subito il risultato. Se quell'attesa scade prima che il comando finisca, perché lo sviluppatore sta ancora rispondendo, l'agente riprende ad aspettare lo stesso comando.

L'agente non usa mai un timer o un'attesa di durata fissa, `sleep`, letture periodiche dell'output del terminale o controlli a intervalli; non chiude mai il turno per farsi risvegliare; non considera mai `trama ask` fallito e non lo ripete.

Le copie generate delle skill (in `.agents/skills/` e quelle incluse nell'estensione) seguono le sorgenti come di consueto.
