import type { ViewName } from "./protocol";

/** The name of each view of the panel: the text of its entry in the side menu and the title of the editor tab that shows it. */
export const VIEW_LABELS: Record<ViewName, string> = {
  board: "Board",
  diagram: "Diagram",
  requirements: "Requirements",
  specs: "Specs",
  history: "History",
  team: "Team",
  settings: "Settings",
  getstarted: "Get Started",
};
