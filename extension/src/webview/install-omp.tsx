import { Download } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export const INSTALL_OMP_TOOLTIP = "Open a terminal that installs omp with its official installer";

/** `Install omp`: shown only while omp is missing. It sends `installOmp`; the host opens the terminal. Used in the wizard, the Settings tab and the missing-omp notice. */
export function InstallOmpButton({ onInstall, ...props }: { onInstall: () => void } & Omit<ComponentProps<typeof Button>, "onClick" | "children">) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" aria-describedby={undefined} {...props} onClick={onInstall}>
          <Download aria-hidden="true" />
          Install omp
        </Button>
      </TooltipTrigger>
      <TooltipContent>{INSTALL_OMP_TOOLTIP}</TooltipContent>
    </Tooltip>
  );
}
