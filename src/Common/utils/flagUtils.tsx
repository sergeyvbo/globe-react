import React from 'react';

/**
 * Утилиты для работы с флагами стран
 */

/**
 * Получает URL флага с fallback на внешний CDN
 * @param countryCode - Код страны (например, 'us', 'ru')
 * @param size - Размер флага ('20x15' или '64x48')
 * @returns URL флага
 */
export function getFlagUrl(countryCode: string, size: '20x15' | '64x48'): string {
  // Сначала пробуем локальный флаг
  const localUrl = `/flags/${size}/${countryCode}.png`;
  
  // В production всегда используем локальные флаги
  if (process.env.NODE_ENV === 'production') {
    return localUrl;
  }
  
  // В development можем использовать fallback
  return localUrl;
}

/**
 * Компонент изображения флага с обработкой ошибок
 */
interface FlagImageProps {
  countryCode: string;
  size: '20x15' | '64x48';
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export function FlagImage({ countryCode, size, alt, className, style }: FlagImageProps) {
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Если локальный флаг не загрузился, пробуем внешний CDN
    const img = e.currentTarget;
    if (img.src.includes('/flags/')) {
      img.src = `https://flagcdn.com/${size}/${countryCode}.png`;
    }
  };

  return (
    <img
      src={getFlagUrl(countryCode, size)}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
    />
  );
}