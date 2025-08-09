import { ReactNode } from "react";

interface EntityListCardWrapperProps {
  children: ReactNode;
}

export function EntityListCardWrapper({ children }: EntityListCardWrapperProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      {children}
    </div>
  );
}