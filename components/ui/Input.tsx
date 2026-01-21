import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-brand-muted text-sm font-medium mb-2 uppercase tracking-wider">{label}</label>}
      <input
        className={`w-full bg-brand-surface border-2 border-brand-dark text-brand-text text-lg p-4 rounded-xl focus:outline-none focus:border-brand-accent focus:shadow-[0_0_15px_rgba(204,255,0,0.1)] transition-all placeholder-gray-600 ${className}`}
        {...props}
      />
    </div>
  );
};

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-brand-muted text-sm font-medium mb-2 uppercase tracking-wider">{label}</label>}
      <textarea
        className={`w-full bg-brand-surface border-2 border-brand-dark text-brand-text text-lg p-4 rounded-xl focus:outline-none focus:border-brand-accent focus:shadow-[0_0_15px_rgba(204,255,0,0.1)] transition-all placeholder-gray-600 min-h-[120px] resize-none ${className}`}
        {...props}
      />
    </div>
  );
};