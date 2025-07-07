import { useEffect } from 'react';

export default function HideCursor() {
  useEffect(() => {
    // Додаємо стиль для приховання курсора
    const style = document.createElement('style');
    style.innerHTML = `
      * {
        cursor: none !important;
      }
      html, body {
        cursor: none !important;
      }
    `;
    document.head.appendChild(style);

    // Додаємо inline стиль до body
    document.body.style.cursor = 'none';
    
    // Cleanup
    return () => {
      document.head.removeChild(style);
      document.body.style.cursor = '';
    };
  }, []);

  return null;
}