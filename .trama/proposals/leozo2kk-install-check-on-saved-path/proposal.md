---
status: discarded
base:
  setup-wizard/omp.md: new
  requirements/rules/setup-wizard.md: 9a8accda3fb57795f947edc24437a02ffd432e783637b49dfb2af2f454fe9f54
  requirements/tech/setup-wizard.md: c2e231b4117b8116497e5950e6ef57c0974c00e14e5f1700ad8b170c583ec474
  project-setup/setup-wizard.md: 0a6814888d3954d56ed84ad65cadee71ca066cd838ff750d91a4e6bfba9b9c77
delete: []
created: 2026-10-24T20:08:08.811Z
---
# Install check on saved path

Makes the Model and the Requirements of the omp step say what the code does when the omp installer terminal ends: the new check is made on the omp path saved in the settings, not on the path the step shows. When the step shows another path, not saved, the answer is ignored and the step keeps its earlier outcome, with Next as that outcome allows.
