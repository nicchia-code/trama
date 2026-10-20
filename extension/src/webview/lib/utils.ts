import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Class names joined and de-duplicated the way shadcn/ui components expect. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
