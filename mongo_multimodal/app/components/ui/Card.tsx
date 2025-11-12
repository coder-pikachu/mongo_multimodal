import React from 'react';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost' | 'feature';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  hoverable?: boolean;
  interactive?: boolean;
}

const cardVariants: Record<CardVariant, string> = {
  default: 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm',
  elevated: 'bg-white dark:bg-neutral-900 shadow-md hover:shadow-lg',
  outlined: 'bg-transparent border-2 border-neutral-200 dark:border-neutral-800',
  ghost: 'bg-neutral-50/50 dark:bg-neutral-800/50 backdrop-blur-sm',
  feature: 'bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 border border-neutral-200/50 dark:border-neutral-700/50',
};

const cardPaddings: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      hoverable = false,
      interactive = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'rounded-xl transition-all duration-300';
    const variantClasses = cardVariants[variant];
    const paddingClasses = cardPaddings[padding];
    const hoverClasses = hoverable ? 'hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-700 hover:-translate-y-0.5' : '';
    const interactiveClasses = interactive ? 'cursor-pointer active:scale-[0.99]' : '';

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${variantClasses} ${paddingClasses} ${hoverClasses} ${interactiveClasses} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card sub-components for composition
export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <h3 className={`text-xl font-semibold text-neutral-900 dark:text-neutral-50 ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <p className={`text-sm text-neutral-600 dark:text-neutral-400 mt-1 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 ${className}`} {...props}>
    {children}
  </div>
);
