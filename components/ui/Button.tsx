import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "py-4 px-8 rounded-xl font-bold transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-brand-accent text-brand-black hover:bg-brand-accentHover shadow-[0_0_20px_rgba(204,255,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-brand-surface text-brand-text hover:bg-gray-700 disabled:opacity-50",
    outline: "border-2 border-brand-surface text-brand-text hover:border-brand-accent hover:text-brand-accent bg-transparent"
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};