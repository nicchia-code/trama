---
column: done
technical: false
refs:
  - agent-terminal/No agent terminal/developer.ASK_AGENT
  - agent-terminal/Agent running/developer.ASK_AGENT
  - agent-terminal/Agent idle/developer.ASK_AGENT
  - requirements/tech#agent-terminal
  - requirements/rules#agent-terminal
drift: null
proposal: null
agent: false
created: 2026-10-06T13:47:41.820Z
---
# Dare il nome dell'istruzione alle finestre WezTerm

Con il launcher «external-terminal», quando il terminale rilevato è WezTerm, la finestra nuova che Trama apre per l'agente porta il nome dell'istruzione (`Scan`, `Design`, `All tasks`, `Import` o il numero breve del Task o della Proposal), come già succede con kitty, Terminal.app e gli altri terminali che accettano un titolo. Vale sia quando Trama chiede la finestra al WezTerm già aperto sia quando deve avviarne uno nuovo; WezTerm permette di dare il titolo a una finestra o a una scheda dal suo controllo a riga di comando. Il titolo si dà una volta sola all'apertura e non cambia più, anche quando la finestra libera viene riusata per un'istruzione con lo stesso nome.
