import React from 'react';
import { useParams } from 'react-router-dom';
import { cn } from '@ui/lib/utils';
import { NameContainerOutlet } from './NameContainerOutlet';
import { BreedNameComponent } from '@/domain/breed/BreedNameComponent';

interface PageTemplateV3Props {
  className?: string;
  isDrawerMode?: boolean;
}

export function PageTemplateV3({ className, isDrawerMode = false }: PageTemplateV3Props) {
  const { id } = useParams();
  
  // Визначаємо який name компонент використовувати (поки що тільки для breed)
  const NameComponent = BreedNameComponent;
  
  return (
    <div className={cn(
      "size-full flex flex-col", 
      isDrawerMode && "bg-white dark:bg-gray-900",
      className
    )}>
      <div className={cn(
        "flex flex-auto flex-col items-center",
        !isDrawerMode && "px-4 pt-4 sm:px-6 sm:pt-6"
      )}>
        <div className={cn(
          "w-full",
          !isDrawerMode && "max-w-3xl lg:max-w-4xl xxl:max-w-5xl"
        )}>
          {/* Name container outlet with the breed name component */}
          <NameContainerOutlet>
            <NameComponent />
          </NameContainerOutlet>
          
          {/* Content area - could be tabs or other content */}
          <div className="mt-6 px-4">
            <p className="text-gray-600">
              Entity ID: {id}
            </p>
            <p className="text-gray-600 mt-2">
              This is where tabs and content will be displayed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}