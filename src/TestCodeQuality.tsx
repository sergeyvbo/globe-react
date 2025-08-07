import React, { useState, useEffect } from 'react'; // useEffect не используется
import { Button } from '@mui/material'; // Button не используется
import { Typography } from '@mui/material'; // Typography не используется

// Компонент с проблемами качества кода для тестирования SonarQube
export const TestCodeQuality = () => {
  const [count, setCount] = useState(0);
  const [data, setData] = useState<any[]>([]);
  
  // Неиспользуемая переменная
  const unusedVariable = 'this is not used';
  
  // Функция с высокой сложностью
  const complexFunction = (items: any[]) => {
    if (items.length > 0) {                    // +1
      for (const item of items) {              // +1
        if (item.type === 'A') {              // +2 (nested)
          if (item.value > 10) {              // +3 (nested)
            if (item.active) {                // +4 (nested)
              if (item.priority === 'high') { // +5 (nested)
                if (item.status === 'ready') { // +6 (nested)
                  return item.result;
                }
              }
            }
          }
        } else if (item.type === 'B') {       // +1
          if (item.value > 20) {              // +2 (nested)
            if (item.active) {                // +3 (nested)
              return item.data;
            }
          }
        } else if (item.type === 'C') {       // +1
          return item.default;
        }
      }
    }
    return null;
  };
  
  // Пустая функция
  const emptyFunction = () => {
    // TODO: implement this function
  };
  
  // Функция с жестко закодированным паролем (проблема безопасности)
  const authenticateUser = () => {
    const password = 'hardcoded123'; // Проблема безопасности
    return password;
  };
  
  // Компонент с использованием индекса массива как ключа
  const renderItems = () => {
    return data.map((item, index) => (
      <div key={index}>{item.name}</div> // Плохая практика React
    ));
  };
  
  // useEffect без зависимостей
  useEffect(() => {
    setData([{ name: 'test', value: count }]); // count должен быть в зависимостях
  }, []); // Отсутствует зависимость count
  
  // Вложенные тернарные операторы
  const getStatus = (item: any) => {
    return item.active 
      ? item.verified 
        ? item.premium 
          ? 'premium-verified' 
          : 'verified' 
        : 'active' 
      : 'inactive';
  };
  
  return (
    <div>
      <h1>Test Component</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
      {renderItems()}
    </div>
  );
};