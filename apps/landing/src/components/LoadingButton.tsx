import React, { useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { useNavigate } from 'react-router-dom';

interface LoadingButtonProps {
  children: React.ReactNode;
  onClick?: () => void | Promise<void>;
  to?: string;
  className?: string;
  loadingText?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

export function LoadingButton({
  children,
  onClick,
  to,
  className = '',
  loadingText = 'Loading...',
  disabled = false,
  type = 'button'
}: LoadingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleClick = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      if (onClick) {
        await onClick();
      }
      
      // Simulate network delay for demo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (to) {
        navigate(to);
      }
    } catch (error) {
      console.error('Button action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`${className} ${isLoading ? 'cursor-not-allowed' : ''} relative flex items-center justify-center`}
    >
      <span className={`flex items-center justify-center gap-2 ${isLoading ? 'invisible' : ''}`}>
        {children}
      </span>
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center gap-2">
          <LoadingSpinner size="sm" color="current" />
          <span>{loadingText}</span>
        </span>
      )}
    </button>
  );
}