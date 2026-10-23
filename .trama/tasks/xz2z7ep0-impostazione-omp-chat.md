---
column: done
technical: false
refs:
  - panel/Settings
  - requirements/ui#panel/Settings
drift: null
proposal: snm0wfcf
agent: false
created: 2026-10-23T10:40:47.041Z
finished: 2026-10-23T10:49:35.695Z
---
# Impostazione omp Chat

Nella scheda Settings del pannello, il gruppo Features ha una funzione in più, omp Chat, spenta finché il developer non la accende, come le altre. Vale solo con omp: quando `trama.agent` è la chat di Cursor la sua casella resta visibile ma disabilitata, con accanto la nota che vale solo con omp, e il valore scelto prima non cambia; torna attiva appena l'agente scelto torna omp.

Quando è finito:
- Il manifest dichiara `trama.ompChat`: booleana, default `false`, `scope: "application"`, con la descrizione in inglese «On, with omp: Trama's jobs open a conversation in the omp Chat view of the secondary side bar instead of a terminal. Every command runs without asking.».
- `SETTING_GROUPS` (`extension/src/host/settings-schema.ts`) mette `trama.ompChat` nel gruppo `Features`, ultima dopo `trama.subagentsContextSharing`; `EXPLICIT_TITLES` le dà il titolo `omp Chat`. Il valore si legge solo con `inspect("trama.ompChat").globalValue === true`.
- La scheda mostra `trama.ompChat` come `Checkbox` di shadcn/ui. Con `trama.agent` diverso da `omp` la casella è disabilitata (attributo `disabled`, attenuata come i controlli disabilitati di shadcn/ui) e mostra il valore salvato; dopo la «i» compare il testo secondario `Only with omp`, collegato al controllo con `aria-describedby`. Con `omp` la nota sparisce e la casella è attiva. Il cambio di agente si riflette subito, senza riaprire la scheda: il messaggio `settings` porta anche il valore di `trama.agent`, e `SettingField` (`extension/src/webview/settings/field.tsx`) prende le proprietà `disabled` e `note`.
- `planSettingChange` rifiuta una scrittura di `trama.ompChat` che arrivi dal webview mentre `trama.agent` non è `omp`.
- I test del webview delle impostazioni coprono la casella attiva con `omp`, disabilitata con la nota con `cursor`, e il passaggio fra i due quando cambia l'agente.
