import { Registry } from "../registry";
import { ADVISOR_COMMANDS } from "./advisor";
import { ANNOUNCEMENT_COMMANDS } from "./announcement";
import { COMPARISON_COMMANDS } from "./comparison";
import { DRIFT_COMMANDS } from "./drift";
import { HISTORY_COMMANDS } from "./history";
import { HOOK_COMMANDS } from "./hook";
import { MODEL_COMMANDS } from "./model";
import { PROJECT_COMMANDS } from "./project";
import { PROPOSAL_COMMANDS } from "./proposal";
import { QUESTION_COMMANDS } from "./question";
import { TASK_COMMANDS } from "./task";
import { TIMING_COMMANDS } from "./timing";

/** Every command of the command line. Declare a command in its object's file and list its file here. */
export const REGISTRY = new Registry([...MODEL_COMMANDS, ...PROPOSAL_COMMANDS, ...TASK_COMMANDS, ...DRIFT_COMMANDS, ...HISTORY_COMMANDS, ...ANNOUNCEMENT_COMMANDS, ...COMPARISON_COMMANDS, ...QUESTION_COMMANDS, ...ADVISOR_COMMANDS, ...PROJECT_COMMANDS, ...TIMING_COMMANDS, ...HOOK_COMMANDS]);
