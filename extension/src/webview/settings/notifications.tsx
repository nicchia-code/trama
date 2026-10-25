import { BellRing, Loader } from "lucide-react";
import { useId } from "react";
import { Button } from "../ui/button";
import { type ApiKeyControls, SecretButtons, type SecretButtonWords } from "../setup-shared";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { type TestNotificationState, testNotificationLine } from "./logic";

/** The title of the subgroup of Advanced that has these controls under its two fields: the Settings tab's alone. */
export const NOTIFICATIONS_SUBGROUP = "Notifications";

/** The labels, names and tooltips of the access token's buttons: in English, whatever `trama.language` says. */
const TOKEN_WORDS: SecretButtonWords = {
  set: "Set access token",
  change: "Change access token",
  remove: "Remove access token",
  setName: "Set ntfy access token",
  changeName: "Change ntfy access token",
  removeName: "Remove ntfy access token",
  setTip: "Save the access token of your ntfy server",
  removeTip: "Remove the ntfy access token saved in Trama",
};

/**
 * What the Notifications subgroup shows under its two fields: the line that an access token is saved (never the token), its buttons, and Send test notification on its own row
 * with the line that says how the test went. `token` follows the host's `ntfyToken`; `block` is why the test is not available (an empty topic, a setting that is not valid), or null;
 * `test` is what the host said of the test; `onSend` asks for a test.
 */
export function NotificationsControls({ token, block, test, onSend }: { token: ApiKeyControls; block: string | null; test: TestNotificationState | null; onSend: () => void }) {
  const reasonId = useId();
  const sending = test?.state === "sending";
  const line = testNotificationLine(test);
  const button = (
    <Button type="button" variant="outline" size="sm" {...(block !== null || sending ? { disabled: true, "aria-disabled": true } : {})} {...(block === null ? {} : { "aria-describedby": reasonId })} onClick={onSend}>
      {sending ? <Loader aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <BellRing aria-hidden="true" />}
      Send test notification
    </Button>
  );
  return (
    <div className="grid gap-3">
      {token.saved ? <p className="m-0 text-sm text-muted-foreground">Access token saved</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <SecretButtons controls={token} unavailable={false} words={TOKEN_WORDS} />
      </div>
      <div className="grid justify-items-start gap-2">
        {block === null ? (
          button
        ) : (
          <>
            <span id={reasonId} hidden>
              {block}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {button}
                </span>
              </TooltipTrigger>
              <TooltipContent>{block}</TooltipContent>
            </Tooltip>
          </>
        )}
        <div aria-live="polite" className="min-w-0 empty:hidden">
          {line === null ? null : <p className={line.tone === "failed" ? "m-0 text-sm text-destructive wrap-anywhere" : "m-0 text-sm text-muted-foreground wrap-anywhere"}>{line.text}</p>}
        </div>
      </div>
    </div>
  );
}
