import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-neutral-900 shadow-sm hover:shadow-md active:shadow-glow disabled:bg-primary-500/50 disabled:hover:shadow-none',
  secondary: 'bg-secondary-500 hover:bg-secondary-600 active:bg-secondary-700 text-white shadow-sm hover:shadow-md disabled:bg-secondary-500/50',
  tertiary: 'bg-accent-purple-500 hover:bg-accent-purple-600 active:bg-accent-purple-700 text-white shadow-sm hover:shadow-md disabled:bg-accent-purple-500/50',
  ghost: 'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:hover:bg-transparent',
  danger: 'bg-error-500 hover:bg-error-600 active:bg-error-700 text-white shadow-sm hover:shadow-md disabled:bg-error-500/50',
  success: 'bg-success-500 hover:bg-success-600 active:bg-success-700 text-white shadow-sm hover:shadow-md disabled:bg-success-500/50',
};

const buttonSizes: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1.5 text-xs rounded-md',
  sm: 'px-3 py-2 text-sm rounded-md',
  md: 'px-4 py-2.5 text-base rounded-lg',
  lg: 'px-5 py-3 text-lg rounded-lg',
  xl: 'px-6 py-4 text-xl rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50';
    const variantClasses = buttonVariants[variant];
    const sizeClasses = buttonSizes[size];
    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${widthClass} ${className}`}
        {...props}
      >
        {isLoading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {!isLoading && leftIcon && (
          <span className="mr-2 inline-flex items-center" aria-hidden="true">{leftIcon}</span>
        )}
        {children}
        {rightIcon && (
          <span className="ml-2 inline-flex items-center" aria-hidden="true">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
