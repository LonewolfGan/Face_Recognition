import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Badge — design system primitive.
 * Variants: default | accent | success | error | warning
 */
const variants = {
  default: 'bg-subtle text-muted border-app',
  accent:  'bg-accent-muted text-tech-violet border-accent',
  success: 'bg-[rgba(16,185,129,0.10)] text-[#10b981] border-[rgba(16,185,129,0.20)]',
  error:   'bg-[rgba(220,38,38,0.08)]  text-[#dc2626] border-[rgba(220,38,38,0.18)]',
  warning: 'bg-[rgba(245,158,11,0.08)] text-[#d97706] border-[rgba(245,158,11,0.18)]',
};

function Badge({ variant = 'default', className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded border',
        'font-mono text-[11px] font-medium leading-none tracking-wide',
        variants[variant] ?? variants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
