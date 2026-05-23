import React from "react";
import { cn } from "../../lib/utils";

/**
 * Badge — shadcn-style primitive.
 * Variants:
 *  - "yellow"  : badge accent (utilise tech-violet)
 *  - "paprika" : badge secondaire (utilise tech-violet/biometric-glow)
 *  - "teal"    : badge succès (signal-teal — usage limité)
 *  - "coral"   : badge erreur (secure-coral — usage limité)
 *  - "indigo"  : badge neutre
 */
const variantStyles = {
  yellow:
    "bg-[rgba(122,53,242,0.12)] text-tech-violet dark:bg-[rgba(155,112,229,0.15)] dark:text-biometric-glow",
  paprika:
    "bg-[rgba(122,53,242,0.12)] text-tech-violet dark:bg-[rgba(155,112,229,0.15)] dark:text-biometric-glow",
  teal:
    "bg-[rgba(0,221,187,0.12)] text-signal-teal",
  coral:
    "bg-[rgba(255,102,153,0.12)] text-secure-coral",
  indigo:
    "bg-[rgba(122,53,242,0.10)] text-tech-violet dark:bg-[rgba(155,112,229,0.15)] dark:text-facial-light",
};

function Badge({ variant = "yellow", className, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
        "text-[13px] font-semibold leading-none",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
