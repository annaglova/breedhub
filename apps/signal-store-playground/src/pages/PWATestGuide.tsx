import React, { useState } from 'react';
import { CheckCircle, Circle, AlertCircle, Info } from 'lucide-react';

interface TestStep {
  id: string;
  title: string;
  description: string;
  steps: string[];
  expected: string;
  completed?: boolean;
}

export default function PWATestGuide() {
  const [completedTests, setCompletedTests] = useState<Set<string>>(new Set());

  const testScenarios: TestStep[] = [
    {
      id: 'service-worker',
      title: '1️⃣ Service Worker Registration',
      description: 'Перевірка реєстрації Service Worker',
      steps: [
        'Відкрийте DevTools (F12)',
        'Перейдіть на вкладку Application',
        'Зліва виберіть Service Workers',
        'Переконайтеся що статус "Activated and is running"'
      ],
      expected: 'Service Worker повинен бути зареєстрований і активний (зелений статус)'
    },
    {
      id: 'offline-mode',
      title: '2️⃣ Offline Mode Test',
      description: 'Тестування роботи в офлайн режимі',
      steps: [
        'В DevTools перейдіть на вкладку Network',
        'Виберіть Throttling → Offline',
        'Оновіть сторінку (F5)',
        'Побачите офлайн сторінку замість помилки',
        'Поверніть Network → No throttling'
      ],
      expected: 'Красива офлайн сторінка з повідомленням про втрату з\'єднання'
    },
    {
      id: 'cache-test',
      title: '3️⃣ Cache Storage Test',
      description: 'Перевірка кешування ресурсів',
      steps: [
        'DevTools → Application → Cache Storage',
        'Розгорніть Cache Storage зліва',
        'Побачите різні кеші (static-assets, images, etc)',
        'Клікніть на кожен кеш - побачите збережені файли'
      ],
      expected: 'Мінімум 3-4 різних кеші з файлами всередині'
    },
    {
      id: 'install-pwa',
      title: '4️⃣ PWA Installation',
      description: 'Встановлення додатку',
      steps: [
        'В Chrome: меню (⋮) → "Install BreedHub..."',
        'Або: в адресному рядку справа іконка встановлення',
        'Клікніть Install в діалозі',
        'Додаток відкриється в окремому вікні'
      ],
      expected: 'PWA встановлюється і працює як окремий додаток'
    },
    {
      id: 'background-sync',
      title: '5️⃣ Background Sync Test',
      description: 'Тестування фонової синхронізації',
      steps: [
        'Перейдіть на /background-sync',
        'Введіть дані в форму (Name, Description)',
        'Перейдіть в офлайн (Network → Offline)',
        'Натисніть Create/Update/Delete',
        'Поверніться онлайн',
        'Дані автоматично синхронізуються'
      ],
      expected: 'Операції в черзі, потім автоматична синхронізація'
    },
    {
      id: 'lighthouse-pwa',
      title: '6️⃣ Lighthouse PWA Audit',
      description: 'Перевірка PWA метрик',
      steps: [
        'DevTools → Lighthouse',
        'Натисніть Settings (⚙️)',
        'Відмітьте ✅ Progressive Web App',
        'Зніміть галочки з інших категорій',
        'Натисніть "Analyze page load"',
        'Дочекайтеся результатів'
      ],
      expected: 'PWA score > 80 (ідеально > 90)'
    },
    {
      id: 'persistent-storage',
      title: '7️⃣ Persistent Storage',
      description: 'Запит постійного сховища',
      steps: [
        'Перейдіть на /offline-data',
        'Знайдіть секцію Storage Information',
        'Натисніть "Check Storage"',
        'Натисніть "Request Persistent Storage"'
      ],
      expected: 'Повідомлення "Storage is persistent!" або розмір використаного сховища'
    },
    {
      id: 'update-flow',
      title: '8️⃣ App Update Test',
      description: 'Тестування оновлення PWA',
      steps: [
        'Внесіть зміну в код (наприклад, змініть текст)',
        'Збережіть файл',
        'Оновіть сторінку двічі',
        'Побачите повідомлення про оновлення',
        'Натисніть "Update" коли з\'явиться'
      ],
      expected: 'Нова версія завантажується автоматично'
    }
  ];

  const toggleTest = (id: string) => {
    const newCompleted = new Set(completedTests);
    if (newCompleted.has(id)) {
      newCompleted.delete(id);
    } else {
      newCompleted.add(id);
    }
    setCompletedTests(newCompleted);
  };

  const completionRate = Math.round((completedTests.size / testScenarios.length) * 100);

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 PWA Testing Guide
          </h1>
          <p className="text-lg text-gray-600">
            Покрокова інструкція для тестування всіх PWA функцій
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-lg font-semibold">Прогрес тестування</span>
            <span className="text-2xl font-bold text-purple-600">{completionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Виконано {completedTests.size} з {testScenarios.length} тестів
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Швидкі дії для початку
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
            <button
              onClick={() => window.open('/reset-sw.html', '_blank')}
              className="px-4 py-2 bg-white text-blue-700 rounded border border-blue-300 hover:bg-blue-50"
            >
              🔧 Reset Service Worker
            </button>
            <button
              onClick={() => {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(regs => {
                    alert(`Service Workers: ${regs.length} registered`);
                  });
                }
              }}
              className="px-4 py-2 bg-white text-blue-700 rounded border border-blue-300 hover:bg-blue-50"
            >
              📊 Check SW Status
            </button>
            <button
              onClick={async () => {
                if ('storage' in navigator && 'estimate' in navigator.storage) {
                  const estimate = await navigator.storage.estimate();
                  const mb = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
                  alert(`Storage used: ${mb} MB`);
                }
              }}
              className="px-4 py-2 bg-white text-blue-700 rounded border border-blue-300 hover:bg-blue-50"
            >
              💾 Check Storage
            </button>
          </div>
        </div>

        {/* Test Scenarios */}
        <div className="space-y-4">
          {testScenarios.map((test) => {
            const isCompleted = completedTests.has(test.id);
            
            return (
              <div 
                key={test.id}
                className={`bg-white rounded-lg shadow-lg overflow-hidden transition-all ${
                  isCompleted ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleTest(test.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-400 mr-3" />
                        )}
                        <h2 className="text-xl font-semibold">{test.title}</h2>
                      </div>
                      <p className="text-gray-600 ml-9">{test.description}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 ml-9">
                    <h4 className="font-semibold text-gray-700 mb-2">Кроки:</h4>
                    <ol className="space-y-1">
                      {test.steps.map((step, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          {index + 1}. {step}
                        </li>
                      ))}
                    </ol>
                    
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm">
                        <span className="font-semibold text-green-800">✅ Очікуваний результат:</span>
                        <span className="text-green-700 ml-2">{test.expected}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-900 mb-3 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Поради для тестування
          </h3>
          <ul className="space-y-2 text-sm text-yellow-800">
            <li>• Використовуйте Chrome або Edge для кращої підтримки PWA</li>
            <li>• Очистіть кеш браузера перед початком тестування</li>
            <li>• Для тесту встановлення PWA потрібен HTTPS (або localhost)</li>
            <li>• Background Sync краще працює з встановленим PWA</li>
            <li>• Periodic Sync доступний тільки для встановлених PWA на HTTPS</li>
            <li>• Використовуйте інкогніто режим для чистого тестування</li>
          </ul>
        </div>

        {/* Results Summary */}
        {completedTests.size === testScenarios.length && (
          <div className="mt-8 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold mb-2">🎉 Вітаємо!</h2>
            <p className="text-lg">Ви успішно протестували всі PWA функції!</p>
            <p className="mt-2">Ваш додаток готовий до використання як Progressive Web App</p>
          </div>
        )}
      </div>
    </div>
  );
}