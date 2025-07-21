import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, label, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input ref={ref} className={`w-full ${className}`} {...props} />
        <div className="h-5 mt-1">
          {error && (
            <p className="text-red-500 text-sm text-left">{error}</p>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
