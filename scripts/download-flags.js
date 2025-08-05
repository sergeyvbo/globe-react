const fs = require('fs');
const path = require('path');
const https = require('https');
const countryCodes = require('../src/Common/GeoData/countryCodes2.json');

// Создаем папки для флагов разных размеров
const flagDirs = {
  '20x15': path.join(__dirname, '../public/flags/20x15'),
  '64x48': path.join(__dirname, '../public/flags/64x48')
};

// Создаем папки если их нет
Object.values(flagDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Функция для загрузки файла
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Удаляем файл при ошибке
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Функция для загрузки флага в разных размерах
async function downloadFlag(countryCode) {
  const sizes = ['20x15', '64x48'];
  
  for (const size of sizes) {
    const url = `https://flagcdn.com/${size}/${countryCode}.png`;
    const filepath = path.join(flagDirs[size], `${countryCode}.png`);
    
    // Пропускаем если файл уже существует
    if (fs.existsSync(filepath)) {
      console.log(`Пропускаем ${countryCode} (${size}) - уже существует`);
      continue;
    }
    
    try {
      await downloadFile(url, filepath);
      console.log(`✓ Загружен ${countryCode} (${size})`);
    } catch (error) {
      console.error(`✗ Ошибка загрузки ${countryCode} (${size}):`, error.message);
    }
  }
}

// Основная функция
async function downloadAllFlags() {
  console.log(`Начинаем загрузку ${countryCodes.length} флагов...`);
  
  let completed = 0;
  let errors = 0;
  
  // Загружаем флаги с ограничением параллельных запросов
  const batchSize = 5;
  for (let i = 0; i < countryCodes.length; i += batchSize) {
    const batch = countryCodes.slice(i, i + batchSize);
    
    await Promise.allSettled(
      batch.map(async (country) => {
        try {
          await downloadFlag(country.code);
          completed++;
        } catch (error) {
          errors++;
          console.error(`Ошибка для ${country.code}:`, error.message);
        }
      })
    );
    
    // Небольшая пауза между батчами
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\nЗагрузка завершена:`);
  console.log(`✓ Успешно: ${completed}`);
  console.log(`✗ Ошибок: ${errors}`);
  console.log(`📁 Флаги сохранены в: public/flags/`);
}

// Запускаем загрузку
downloadAllFlags().catch(console.error);