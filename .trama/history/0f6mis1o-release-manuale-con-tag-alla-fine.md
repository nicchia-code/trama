---
created: 2026-10-29T14:05:07.997Z
updated: 2026-10-29T14:05:07.997Z
summary: La release parte solo a mano e crea tag e release insieme, dopo che le tre piattaforme sono passate; un tag già esistente ferma la corsa prima di costruire.
tasks:
  - 0cechbrk
---
# Release manuale con tag alla fine

Il workflow Release non parte più dal push di un tag `v*`: si avvia solo a mano, da qualsiasi branch e senza input, con sempre le tre piattaforme. Un primo job controlla che il tag `v<versione>` non esista, con o senza release, e altrimenti ferma la corsa chiedendo di alzare la versione. Il tag nasce insieme alla release, solo quando tutte le piattaforme passano, e il workflow non sposta né cancella mai un tag. CONTRIBUTING.md e CHANGELOG.md descrivono il nuovo avvio.
