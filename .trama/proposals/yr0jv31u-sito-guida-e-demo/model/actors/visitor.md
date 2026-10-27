# Visitor

A person who browses Trama's website: the landing page, the guide and the demo. Inside the demo window the visitor also acts as the developer of the demo project: every Event of the developer that the editor extension accepts is available there, except those of Manager mode and Team (see Demo). The Events below are only those of the website around the extension.

## Events

### OPEN_DEMO
The visitor opens the demo page, from its address, from the site's navigation or by clicking the animated preview of the landing page.

### LEAVE_DEMO
The visitor leaves the demo page, by navigating elsewhere on the site, reloading it or closing it.

### RESIZE_WINDOW
The browser window of the visitor changes width across the minimum width of the demo, in either direction.

### RESET_DEMO
The visitor presses Reset in the demo's toolbar.

### ENTER_FULLSCREEN
The visitor presses the full screen button of the demo's toolbar.

### EXIT_FULLSCREEN
The visitor leaves full screen, with the same button or with the browser's own way out (Esc).

### START_CHAPTER
The visitor chooses a chapter in the tour's list of chapters.

### FOLLOW_STEP
The visitor does, in the demo window, what the tour's arrow points to.

### ACT_OFF_STEP
The visitor does, in the demo window, something other than what the tour's arrow points to.

### RETURN_TO_STEP
The visitor chooses, in the tour's bubble shown after an action off the step, to go back to the step.

### SKIP_TOUR
The visitor chooses to explore freely: Skip tour in the tour's bubble or in the list of chapters, or Continue freely in the bubble shown after an action off the step.

### SPEED_UP_AGENT
The visitor presses the button that brings the scripted agent's work to its end at once, shown in omp Chat of the demo while a script plays.
