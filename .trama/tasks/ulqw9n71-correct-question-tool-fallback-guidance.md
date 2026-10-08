---
column: done
technical: true
refs:
  - requirements/rules#question-round
drift: null
proposal: null
agent: false
created: 2026-10-08T05:29:53.617Z
finished: 2026-10-08T05:30:36.425Z
---
# Correct question-tool fallback guidance

Le skill trama-design e trama-import devono trattare un errore d'uso o di input di trama ask come una chiamata da correggere e ripetere, mai come indisponibilità dell'editor. Solo la risposta iniziale status: unavailable consente di passare allo strumento di domande dell'agente; uno skip deliberato non va riproposto.
