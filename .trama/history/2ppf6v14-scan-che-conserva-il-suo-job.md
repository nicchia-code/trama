---
created: 2026-10-18T07:32:06.916Z
updated: 2026-10-18T07:32:06.916Z
summary: Quando l'agente annuncia uno scan lanciato da Trama, l'annuncio conserva il job del lancio, così il cambio di fase, la consegna e l'esito fallito restano legati al lavoro giusto.
tasks:
  - 5mwxywyp
---
# Scan che conserva il suo job

Prima, la presa in carico di uno scan lanciato da Trama scartava il job indicato dall'agente, e il legame andava perso prima del cambio di fase e della consegna. Ora il job del lancio resta sull'annuncio.
