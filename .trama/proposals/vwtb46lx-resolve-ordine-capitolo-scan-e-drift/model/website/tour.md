# Tour

The guided presentation of the demo: arrows and bubbles over the VS Code window point at the next thing to do, one step at a time, and a list of chapters shows where the visitor is. Each chapter is a short sequence of steps on the shop. A step is followed when the visitor does what the arrow points to, or, for a step that waits for the scripted agent, when its script ends. While the tour guides, everything in the window still works.

Every chapter has a starting point: the shop as the chapters before it leave it when followed in order. Starting a chapter from the list puts both folders of the demo at that starting point, throwing away what was done since.

## States

### Off (initial)
No arrow and no bubble: the visitor explores freely. The list of chapters stays at hand to start the tour again.
- `demo.READY` → Design and questions: the demo has just loaded or been reset; the tour starts from its first chapter.
- `visitor.START_CHAPTER` → Design and questions: the visitor chooses that chapter.
- `visitor.START_CHAPTER` → Running Tasks: the visitor chooses that chapter.
- `visitor.START_CHAPTER` → Scan and Drifts: the visitor chooses that chapter.
- `visitor.START_CHAPTER` → Setup and import: the visitor chooses that chapter.

### Guiding
An arrow and a bubble point at the next step; the list of chapters marks the current chapter and step.
- `visitor.SKIP_TOUR` → Off: the arrow and the bubble disappear; the demo stays as it is.
- `demo.READY` → Design and questions: the demo has been reset; the tour starts again from its first chapter.
- `visitor.START_CHAPTER` → Design and questions: the visitor chooses that chapter.
- `visitor.START_CHAPTER` → Running Tasks: the visitor chooses that chapter.
- `visitor.START_CHAPTER` → Scan and Drifts: the visitor chooses that chapter.
- `visitor.START_CHAPTER` → Setup and import: the visitor chooses that chapter.

#### Design and questions (initial)
The visitor asks the agent for a change of the shop and answers its questions. The steps: start a design request from the Board; send the request, already written (discount codes at checkout); watch the agent explore in omp Chat while its ghost waits on the Board; answer the round of questions that opens over the panel and send it; see the Proposal arrive on the Board.
- `visitor.FOLLOW_STEP` → Design and questions: a step that is not the last of the chapter; the arrow moves to the next step.
- `scripted-agent.FINISHED` → Design and questions: the step was waiting for that script; the arrow moves to the next step.
- `visitor.FOLLOW_STEP` → Running Tasks: the last step of the chapter.
- `visitor.ACT_OFF_STEP` → Design and questions: what the visitor did happens. The arrow hides and a bubble offers to go back to the step or to continue freely.
- `visitor.RETURN_TO_STEP` → Design and questions: the arrow comes back to the step. When what the visitor did makes the step impossible, the chapter starts again from its starting point.

#### Running Tasks
The visitor reviews the Proposal, approves it and has the agent run its Tasks. The steps: open the Proposal on the Diagram and look at what it changes; go back to the Board and approve it; see its Tasks appear in To do; run them all; watch the agent take them, move them to Done and report in omp Chat; open the History to see the work recorded.
- `visitor.FOLLOW_STEP` → Running Tasks: a step that is not the last of the chapter; the arrow moves to the next step.
- `scripted-agent.FINISHED` → Running Tasks: the step was waiting for that script; the arrow moves to the next step.
- `visitor.FOLLOW_STEP` → Scan and Drifts: the last step of the chapter.
- `visitor.ACT_OFF_STEP` → Running Tasks: what the visitor did happens. The arrow hides and a bubble offers to go back to the step or to continue freely.
- `visitor.RETURN_TO_STEP` → Running Tasks: the arrow comes back to the step. When what the visitor did makes the step impossible, the chapter starts again from its starting point.

#### Scan and Drifts
The visitor has the agent compare the code with the Model and decides on what differs. The steps: start Scan System from the side menu; watch the agent compare the code with the Model in omp Chat; go to the Board; open the Drift and read what happens in the code and what should happen; close the card; press Resolve; choose one of the Fix options, confirm and send; approve the resolution, which Trama writes: the Drift is resolved and leaves the Board, and the Task that fixes the code appears in To do; run that Task; watch the agent fix the code and close the Task; see the Task in Done.
- `visitor.FOLLOW_STEP` → Scan and Drifts: a step that is not the last of the chapter; the arrow moves to the next step.
- `scripted-agent.FINISHED` → Scan and Drifts: the step was waiting for that script; the arrow moves to the next step.
- `visitor.FOLLOW_STEP` → Setup and import: the last step of the chapter.
- `visitor.ACT_OFF_STEP` → Scan and Drifts: what the visitor did happens. The arrow hides and a bubble offers to go back to the step or to continue freely.
- `visitor.RETURN_TO_STEP` → Scan and Drifts: the arrow comes back to the step. When what the visitor did makes the step impossible, the chapter starts again from its starting point.

#### Setup and import
The visitor puts Trama into a project that has only code. The steps: switch to the second folder, where the panel shows Get Started; choose Import from Code in the setup wizard and go through its steps; watch the agent read the code and write the import Proposal in omp Chat; approve the import Proposal on the Board; see the new Model on the Diagram.
- `visitor.FOLLOW_STEP` → Setup and import: a step that is not the last of the chapter; the arrow moves to the next step.
- `scripted-agent.FINISHED` → Setup and import: the step was waiting for that script; the arrow moves to the next step.
- `visitor.FOLLOW_STEP` → Off: the last step of the tour. A closing bubble links the guide and the install of the extension, then the visitor explores freely.
- `visitor.ACT_OFF_STEP` → Setup and import: what the visitor did happens. The arrow hides and a bubble offers to go back to the step or to continue freely.
- `visitor.RETURN_TO_STEP` → Setup and import: the arrow comes back to the step. When what the visitor did makes the step impossible, the chapter starts again from its starting point.
