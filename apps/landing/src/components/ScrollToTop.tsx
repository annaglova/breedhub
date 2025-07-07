import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Прокрутка вгору при зміні маршруту
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Використовуємо instant для миттєвої прокрутки
    });
  }, [pathname]);

  return null;
}