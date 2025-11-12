import React from 'react';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'purple'
  | 'orange'
  | 'neutral';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  outline?: boolean;
}

const badgeVariants: Record<BadgeVariant, string> = {
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  secondary: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-400',
  success: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
  error: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400',
  info: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-400',
  purple: 'bg-accent-purple-100 text-accent-purple-700 dark:bg-accent-purple-900/30 dark:text-accent-purple-400',
  orange: 'bg-accent-orange-100 text-accent-orange-700 dark:bg-accent-orange-900/30 dark:text-accent-orange-400',
  neutral: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
};

const badgeOutlineVariants: Record<BadgeVariant, string> = {
  primary: 'border-primary-500 text-primary-700 dark:text-primary-400',
  secondary: 'border-secondary-500 text-secondary-700 dark:text-secondary-400',
  success: 'border-success-500 text-success-700 dark:text-success-400',
  warning: 'border-warning-500 text-warning-700 dark:text-warning-400',
  error: 'border-error-500 text-error-700 dark:text-error-400',
  info: 'border-secondary-500 text-secondary-700 dark:text-secondary-400',
  purple: 'border-accent-purple-500 text-accent-purple-700 dark:text-accent-purple-400',
  orange: 'border-accent-orange-500 text-accent-orange-700 dark:text-accent-orange-400',
  neutral: 'border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300',
};

const badgeDotColors: Record<BadgeVariant, string> = {
  primary: 'bg-primary-500',
  secondary: 'bg-secondary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  info: 'bg-secondary-500',
  purple: 'bg-accent-purple-500',
  orange: 'bg-accent-orange-500',
  neutral: 'bg-neutral-500',
};

const badgeSizes: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-2xs',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

const dotSizes: Record<BadgeSize, string> = {
  xs: 'h-1 w-1',
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2.5 w-2.5',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  outline = false,
  className = '',
  children,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full transition-colors';
  const variantClasses = outline
    ? `bg-transparent border ${badgeOutlineVariants[variant]}`
    : badgeVariants[variant];
  const sizeClasses = badgeSizes[size];
  const dotColorClass = badgeDotColors[variant];
  const dotSizeClass = dotSizes[size];

  return (
    <span
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {dot && (
        <span className={`mr-1.5 rounded-full ${dotColorClass} ${dotSizeClass}`} aria-hidden="true" />
      )}
      {children}
    </span>
  );
};
