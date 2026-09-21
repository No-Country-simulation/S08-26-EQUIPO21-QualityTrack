import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-primary)] text-white hover:opacity-90 active:opacity-100 disabled:bg-slate-200 disabled:text-slate-400 focus-visible:ring-[var(--color-primary)]',
  secondary:
    'bg-[var(--color-neutral-dark)] text-white hover:opacity-90 active:opacity-100 disabled:bg-slate-200 disabled:text-slate-400 focus-visible:ring-[var(--color-neutral-dark)]',
  destructive:
    'bg-[var(--color-destructive)] text-white hover:opacity-90 active:opacity-100 disabled:bg-slate-200 disabled:text-slate-400 focus-visible:ring-[var(--color-destructive)]',
  outline:
    'bg-transparent text-[var(--color-neutral-dark)] border border-slate-300 hover:bg-slate-100 active:bg-slate-200 disabled:border-slate-200 disabled:text-slate-400 disabled:bg-transparent focus-visible:ring-slate-500',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-sm leading-5',
  md: 'px-4 py-2 text-base leading-6', // Body Medium (16px / 24px)
  lg: 'px-6 py-3 text-lg leading-7',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled = false,
  type = 'button',
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-semibold rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};