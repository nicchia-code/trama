---
status: discarded
base:
  agent-launching/omp-chat-conversation.md: 6180705fa6852d37b3822bab199bb4d002adfb78d9c26dccd09e4a989199cbff
  requirements/rules/omp-chat.md: 4c6ada2f749369c2f165f2be9315c449a0aa200dd4e1ca9a1452f3539d7197e2
  requirements/tech/settings.md: 1fff9199442a49d84ceef6c30da371960936e424bb9b7e4f0cbea9c2e454f3fd
delete: []
created: 2026-10-23T11:24:56.574Z
---
# Conversazioni a riposo, niente README

Fa dire al Modello e ai Requisiti ciò che il codice fa già, per il Drift kyaecq54.

- Stop in una conversazione a riposo per Trama, dopo la conferma, interrompe il turno corrente dell'agente e non cambia stato: la conversazione resta in Agent idle.
- Alla ripresa, una conversazione salvata a riposo riporta anche il lavoro salvato: il suo Run torna in corso sulla Board finché la conversazione non si chiude o la ripresa non fallisce.
- L'estensione non ha un README proprio: i Requisiti di `tech#panel/Settings` non chiedono più `extension/README.md`; la descrizione nella vista Extensions resta quella del manifest.

Scelte fatte dall'agente senza intervista, da controllare: le altre sezioni dei Requisiti che nominano `extension/README.md` non cambiano, perché il Drift riguarda solo `tech#panel/Settings`.
