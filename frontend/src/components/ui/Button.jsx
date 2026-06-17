import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Button — design system primitive.
 * Variants: primary | ghost | outline | danger
 * Sizes:    sm | md | lg
 */
const variants = {
  primary: 'bg-tech-violet text-white border-tech-violet hover:bg-violet-hover hover:border-violet-hover',
  ghost:   'bg-transparent border-fg text-fg hover:bg-accent-muted',
  outline: 'bg-transparent border-[var(--accent)] text-[var(--accent)] hover:bg-accent-muted',
  danger:  'bg-transparent border-[rgba(220,38,38,0.3)] text-[#dc2626] hover:bg-[rgba(220,38,38,0.07)]',
};

const sizes = {
  sm: 'h-8  px-3 text-[12px] gap-1.5 rounded-md',
  md: 'h-9  px-4 text-[13px] gap-2   rounded-lg',
  lg: 'h-10 px-5 text-[14px] gap-2   rounded-lg',
};

const Button = React.forwardRef(function Button(
  { variant = 'primary', size = 'md', className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center border font-semibold font-heading cursor-pointer leading-none',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(122,53,242,0.4)]',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
