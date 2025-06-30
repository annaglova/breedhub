import React, { useEffect, ReactNode } from 'react';
import { usePageContent } from '../../store/reduxHooks';

interface ViewportProviderProps {
  children: ReactNode;
}

/**
 * Компонент для відстеження viewport та автоматичного оновлення responsive breakpoints
 * Замінює Angular VIEWPORT injection
 */
export const ViewportProvider: React.FC<ViewportProviderProps> = ({ children }) => {
  const { setViewport, initializeViewport } = usePageContent();

  useEffect(() => {
    // Ініціалізація viewport при mount
    initializeViewport();

    // Обробник зміни розміру вікна
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Обробник scroll
    const handleScroll = () => {
      // setScrollTop(window.scrollY); // Якщо потрібно відстежувати глобальний scroll
    };

    // Додаємо event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [setViewport, initializeViewport]);

  return <>{children}</>;
};