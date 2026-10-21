---
created: 2026-10-21T11:59:06.996Z
updated: 2026-10-21T11:59:06.996Z
summary: Con l'Advisor Scanner acceso anche la chat di Cursor ha il suo advisor, il sotto-agente trama-advisor, con hook, stato dell'editor e identità per conversazione di schede, annunci, Task e Drift.
tasks:
  - 1vedqgj1
  - 4jc1l8wb
  - bhsu8x0j
  - dk6jpt8h
  - lmqeyse9
  - wc93tx2p
  - bjnq19ee
  - c3jjbasp
  - penhvq3j
  - ph5lqydg
  - pm3rg0fk
  - s79p9ar2
  - x5x3wtih
---
# Advisor della chat di Cursor

L'Advisor Scanner vale con ogni agente: nella chat di Cursor la corsa salta pre-flight e scansione finale, e un sotto-agente di revisione (`trama-advisor`) guarda l'agente principale e ogni sotto-agente che realizza un Task, che corregge le differenze prima del Done.

Gli hook di Cursor traducono modifiche ai file, fine degli strumenti e dei sotto-agenti e fine del turno negli eventi dell'Advisor, leggendo un file di stato scritto da ogni finestra dell'editor; un hook `preToolUse` sulla shell completa i comandi `trama` con `TRAMA_CHAT` e `TRAMA_JOB`.

Ogni conversazione di Trama è un agente a sé: le schede in attesa, gli annunci (con il nuovo campo `conversation`), i Task presi (`cursor:<conversazione>`) e il ritiro degli annunci seguono la conversazione, e i Drift della chat hanno il loro `job` (`trama drift list` con `currentJob`). La Board avvisa quando un Run finisce senza la revisione finale; i pulsanti Scan restano spenti con qualunque agente; `trama-analysis` e `trama-advisor` sono installati con gli hook.
