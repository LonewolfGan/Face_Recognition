import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Card — design system primitive.
 * A clean, bordered surface with optional hover state.
 */
const Card = React.forwardRef(function Card({ className, hover = false, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        'bg-card border border-app rounded-xl',
        hover && 'hover:bg-[var(--card-hover)] transition-colors duration-150',
        className
      )}
      {...props}
    />
  );
});

export default Card;
