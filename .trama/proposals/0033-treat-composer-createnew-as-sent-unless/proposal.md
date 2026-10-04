---
status: approved
base:
  requirements/tech.md: 73f05abe4b8bb16f0878ce947c27d19373ac20629c2394aa0bdd6f69b1482381
  requirements/quality.md: 2110ab10e235e3c8ec644b8aa37b689d72c8dd2c841cf7dbdc748c23e006f184
delete: []
---
# Treat composer.createNew as sent unless it throws

Alla fine di un turno dell'agente nella chat di Cursor compare la conferma «Create chat with prompt» con il prompt appena eseguito. Il motivo: `composer.createNew` non restituisce mai un valore (Cursor 3.23.12), Trama legge il vuoto come fallimento e apre anche il deeplink; per lo stesso motivo dopo una scansione automatica compare anche «Scan now».

Decisioni:
- `composer.createNew` è riuscito se non lancia un errore; il valore restituito non conta. Il deeplink resta solo per un comando assente o in errore.
- Il controllo dei dieci secondi dopo `composer.createNew` (avviso se non arriva PROMPT_SUBMITTED) è tolto.
