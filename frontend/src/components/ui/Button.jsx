import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

/**
 * Button — design system v4 palette.
 * Variants:
 *  - "primary" : bg tech-violet, text zinc-50, hover biometric-glow
 *  - "ghost"   : transparent + border, text title, hover bg section-alt
 *  - "outline" : alias for ghost
 *  - "danger"  : red tones
 * Sizes: "sm" | "md" | "lg"
 *
 * All buttons have the same height per size — NO inconsistent sizes.
 */
const variantStyles = {
  primary:
    "bg-tech-violet text-zinc-50 border-tech-violet hover:bg-biometric-glow hover:border-biometric-glow",
  ghost:
    "bg-transparent text-title border-neutral hover:bg-section-alt",
  outline:
    "bg-transparent text-title border-neutral hover:bg-section-alt",
  danger:
    "bg-transparent text-[#ef4444] border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.08)]",
};

const sizeStyles = {
  sm: "h-9 px-4 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-5 text-[14px] gap-2 rounded-lg",
  lg: "h-11 px-6 text-[15px] gap-2 rounded-lg",
};

const Button = React.forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    className,
    children,
    asMotion = true,
    ...props
  },
  ref
) {
  const Comp = asMotion ? motion.button : "button";
  const motionProps = asMotion
    ? {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
        transition: { duration: 0.15, ease: "easeOut" },
      }
    : {};

  return (
    <Comp
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center border font-semibold cursor-pointer leading-none",
        "transition-colors duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tech-violet/40",
        "disabled:opacity-50 disabled:pointer-events-none",
        variantStyles[variant] ?? variantStyles.primary,
        sizeStyles[size] ?? sizeStyles.md,
        className
      )}
      {...motionProps}
      {...props}
    >
      {children}
    </Comp>
  );
});

export default Button;
