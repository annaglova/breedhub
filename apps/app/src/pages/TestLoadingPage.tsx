import React from 'react';
import { Button } from '@ui/components/button';
import axios from 'axios';
import { useManualLoading } from '@/hooks/useLoadingBar';

export function TestLoadingPage() {
  const { startManualLoading, stopManualLoading } = useManualLoading();

  // Симуляція HTTP запиту
  const handleHttpRequest = async () => {
    try {
      // Запит до публічного API для тестування
      await axios.get('https://jsonplaceholder.typicode.com/posts/1');
      alert('Запит успішний!');
    } catch (error) {
      alert('Помилка запиту');
    }
  };

  // Кілька одночасних запитів
  const handleMultipleRequests = async () => {
    try {
      await Promise.all([
        axios.get('https://jsonplaceholder.typicode.com/posts/1'),
        axios.get('https://jsonplaceholder.typicode.com/posts/2'),
        axios.get('https://jsonplaceholder.typicode.com/posts/3'),
      ]);
      alert('Всі запити завершені!');
    } catch (error) {
      alert('Помилка запитів');
    }
  };

  // Ручне керування loading bar
  const handleManualLoading = () => {
    startManualLoading('manual-test');
    
    // Імітація довгої операції
    setTimeout(() => {
      stopManualLoading('manual-test');
      alert('Операція завершена!');
    }, 3000);
  };

  // Довгий запит з помилкою
  const handleErrorRequest = async () => {
    try {
      await axios.get('https://jsonplaceholder.typicode.com/invalid-endpoint');
    } catch (error) {
      alert('Запит завершився з помилкою (loading bar має зникнути)');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Тестування LoadingBar</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">HTTP запити</h2>
          <p className="text-gray-600 mb-4">LoadingBar автоматично з'являється при HTTP запитах через axios</p>
          
          <div className="flex gap-4">
            <Button onClick={handleHttpRequest}>
              Один запит
            </Button>
            
            <Button onClick={handleMultipleRequests} variant="secondary">
              Кілька запитів
            </Button>
            
            <Button onClick={handleErrorRequest} variant="destructive">
              Запит з помилкою
            </Button>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Ручне керування</h2>
          <p className="text-gray-600 mb-4">Можна керувати LoadingBar вручну для довгих операцій</p>
          
          <Button onClick={handleManualLoading}>
            Показати на 3 секунди
          </Button>
        </div>

        <div className="p-4 border rounded-lg bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">Як це працює:</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>LoadingBar з'являється зверху сторінки при будь-якому HTTP запиті</li>
            <li>Анімація показує прогрес (indeterminate mode)</li>
            <li>При кількох запитах - bar залишається поки всі не завершаться</li>
            <li>При помилках - bar також зникає</li>
            <li>Можна керувати вручну через хук useManualLoading</li>
          </ul>
        </div>
      </div>
    </div>
  );
}