---
created: 2026-10-26T23:36:38.989Z
updated: 2026-10-26T23:36:38.989Z
summary: "Il sito non ha più la demo: la landing mostra la GIF di Trama con Read the guide e Install, l'intestazione non ha più la voce Demo e la pubblicazione non costruisce più le viste dell'estensione."
tasks:
  - 3we2gwmp
  - ouob3r9a
  - w40xe9o8
  - w5rjspwx
  - ksp4jbpb
---
# Sito senza demo interattiva

Sono tolti dal codice la pagina Demo, l'host nel browser, il tour, l'agente a copioni, il video e gli script di registrazione, i sostituti dei moduli Node, gli attributi `data-tour` delle viste dell'estensione e le dipendenze usate solo dalla demo. L'Actor visitor non ha codice proprio da togliere. Il workflow di pubblicazione parte quando cambiano il sito, le immagini, le impostazioni dell'estensione o i file di dipendenze, e non fa screenshot.
