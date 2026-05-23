import React from "react";
import { cn } from "../../lib/utils";

/**
 * Card — shadcn-style primitive.
 * Strict rules:
 *  - No colored borders. Only neutral borders.
 *  - No box-shadow.
 *  - Background = surface-card token (light / dark mode aware).
 */
const Card = React.forwardRef(function Card({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "surface-card border border-neutral rounded-xl",
        className
      )}
      {...props}
    />
  );
});

export default Card;
