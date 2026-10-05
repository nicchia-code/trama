---
column: done
technical: false
refs:
  - question-round/Asking
  - question-round/On question
  - question-round/Writing answer
  - question-round/Confirming skip
  - question-round/Answered
  - requirements/ui#question-round
  - requirements/data#question-round
  - requirements/rules#question-round
  - requirements/tech#question-round
drift: null
proposal: d9680570
agent: false
created: 1970-01-01T00:00:00.032Z
---
# Present question rounds with native choices, Back, Other and confirmed skips

Immediately open one native editor choice menu per question, titled with the asking agent and current step, and keep it visible on focus loss. Preserve supplied option order and tradeoff descriptions; mark and initially select the recommendation, using checkboxes for multiple choice. Back restores earlier answers and revisions replace them. Other opens free text and retains selected ordinary options for multiple choice; refuse empty answers. Escape on the question opens Skip this one, Skip all and Go back; Escape on that confirmation returns unchanged, and Escape or Back from free text returns to the same question. A confirmed skip records no fabricated answer, and Skip all preserves prior answers. Return the round immediately after its last answer or skip with no final Send step. Native tool and locally routed requests use the same presentation behaviour.
