---
status: approved
base:
  requirements/tech/general.md: 92c43d490e09a8e0a0cb2da9d489d37d22f496b4c2ef8a609a2e97fd50ec1e07
  requirements/tech/away-notifications.md: 0de1b94131d90f47a6a629a9f929bf5afd1b04907d7b90ad128ff453ff05750f
  requirements/tech/drift-resolution.md: 86ba4b75a601dd1aa3adb72ae0923d5b2ab7fac7a1eb281cf77fb1e822d0d2b4
  requirements/tech/ghost-notes.md: 19cc2b34f9dabe8e7893c12adbd23e1d451a138ee6af3974a1fbcb3895ee637b
  requirements/tech/handoff.md: ae734594fe361eb4ed22364be408108da49bdf2dfe054b562e3f5d53b1c953b0
  requirements/tech/instruction-files.md: 2f2d86acec9867cf3f17d8a01222e096c730a47cde43fc8e58ea132380b80d08
  requirements/tech/models.md: 6633477622edb3023c5ff8044637f26117ddc3ded68d92de6a8f23859ff7fa64
  requirements/tech/omp-chat.md: 424cef88fbeb8198e4f2bf5f62010ee4b691707c506a4383f996cddba1cfda7d
  requirements/tech/omp-login.md: 2a5112586406aaae14836206eb994a289ce65975f32302cc886c8e43752ef992
  requirements/tech/optional-defaults.md: ad10f14e14583f7a54087691eb9e98a48fc38408350026fb56688baa26aa2b56
  requirements/tech/raffinamento.md: f79c0663c80e803428c6f531553b5753ba55739f8ab3a086fbc833b8aceffd05
  requirements/tech/settings.md: 4237c293404d7e6d32e4a8c7ee11bb576a2c5fcd68f553bd8fc3ef9718f271d3
  requirements/tech/setup-wizard.md: c2bca81f8f81cb3dedafca305761350a9c0691b090cc41457367fbc0c8022bd6
  requirements/tech/solo-merge.md: 0922a03f5daae50da17e5805a031edb477fb0493c0a828813cab3c7f9b735951
  requirements/tech/solo-mode.md: 6711291f409778d85d0086badc13517223a270cc4502c20221e62e98afe9b512
  requirements/tech/system-certificates.md: ddcd3ac21a0fa8448ae70c99a00e6e38240e22a7e603a32eb778368abc1f80e1
  requirements/tech/team.md: 1a284c2ea27ad70e6753858fd236def0da4452948f2e8f7b199c52976d73f355
  requirements/tech/timeline.md: 4a1ad9e9deeba979dcd65c7f5b2ffc6ef95b62b32b688c24cf74ff71a3118069
  requirements/tech/unify-drifts.md: 33b46f0f476e6fcba644719ba97ea5beb1c3318d9d0f94da3a4ecb87f1ca5d38
  requirements/docs/area.md: new
  requirements/docs/readme.md: new
delete: []
created: 2026-10-26T17:23:35.290Z
label: README landing
---
# README come landing

La `README.md` è diventata un manuale di circa 41 KB perché molti frammenti dei Requirements chiedono che `README.md` e `extension/README.md` descrivano ogni funzione nel dettaglio; `extension/README.md` contiene inoltre note di implementazione (componenti, moduli, riferimenti ai Requirements) che non servono a chi usa Trama. Questa Proposal cambia solo i Requirements: le due README diventano la stessa landing corta e invitante, con immagini, e il dettaglio delle funzioni esce dalle README; il Model non cambia.

Decisioni:
- `README.md` è una landing corta: tagline, una GIF, il ciclo in cinque passi con uno screenshot ciascuno, requisiti, installazione, link e licenza.
- `extension/README.md` ha lo stesso testo della landing, con immagini e link come URL assoluti di GitHub.
- Il contenuto tecnico di oggi di `extension/README.md` (componenti, moduli, messaggi, riferimenti ai Requirements) si elimina: è già nei Requirements e nel codice.
- L'avviso sull'approvazione `yolo` di omp Chat resta nella landing come nota breve, con come passare ad `ask`.
- Il dettaglio delle funzioni andrà in un sito GitHub Pages, che si farà dopo: per ora nessuna guida in `docs/`, e i frammenti che chiedevano alle README di descrivere una funzione lo chiedono solo a `CHANGELOG.md`, `docs/cli.md`, `docs/uat.md` e `docs/`, dove già lo facevano.

Assunzioni da verificare:
- Fino al sito GitHub Pages il dettaglio delle impostazioni e delle funzioni facoltative non è documentato fuori da `CHANGELOG.md`, `docs/cli.md`, `docs/uat.md` e dalle descrizioni delle impostazioni nell'editor.
- Le immagini stanno in `docs/images/` (PNG e GIF, niente SVG, che `vsce` rifiuta); gli URL assoluti di `extension/README.md` puntano al branch `main`, quindi le immagini si vedono nel pannello Extensions solo dopo il merge su `main`.
- Le frasi dei frammenti che restano vere per la landing non cambiano: Windows in anteprima e `trama.exe` non firmato, omp come unico agente in VS Code, i comandi nuovi, i nomi dei gruppi di Settings dove compaiono, l'avviso `yolo`.
