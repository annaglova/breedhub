import { ReactNode, useState } from "react";

interface EntityListCardWrapperProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function EntityListCardWrapper({ 
  children, 
  selected = false,
  onClick,
  className = ""
}: EntityListCardWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Визначаємо колір фону залежно від стану (як в Angular версії)
  const getBackgroundColor = () => {
    if (selected) {
      return 'rgb(var(--focus-card-ground))';
    }
    if (isHovered) {
      return 'rgb(var(--hover-card-ground))';
    }
    return 'transparent';
  };
  
  return (
    <div 
      className={`relative flex items-center h-full cursor-pointer border-b border-surface-border px-4 sm:px-7 ${className}`}
      style={{ 
        backgroundColor: getBackgroundColor(),
        transition: 'background-color 150ms'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}