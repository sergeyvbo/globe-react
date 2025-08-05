const fs = require('fs');
const path = require('path');

function getDirectorySize(dirPath) {
  let totalSize = 0;
  let fileCount = 0;
  
  if (!fs.existsSync(dirPath)) {
    return { size: 0, count: 0 };
  }
  
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isFile()) {
      totalSize += stats.size;
      fileCount++;
    }
  }
  
  return { size: totalSize, count: fileCount };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showFlagsInfo() {
  const flagsDir = path.join(__dirname, '../public/flags');
  
  console.log('📊 Информация о флагах\n');
  
  if (!fs.existsSync(flagsDir)) {
    console.log('❌ Папка с флагами не найдена!');
    console.log('💡 Запустите: npm run download-flags');
    return;
  }
  
  const sizes = ['20x15', '64x48'];
  let totalSize = 0;
  let totalFiles = 0;
  
  for (const size of sizes) {
    const sizeDir = path.join(flagsDir, size);
    const { size: dirSize, count: fileCount } = getDirectorySize(sizeDir);
    
    totalSize += dirSize;
    totalFiles += fileCount;
    
    console.log(`📁 ${size}:`);
    console.log(`   Файлов: ${fileCount}`);
    console.log(`   Размер: ${formatBytes(dirSize)}\n`);
  }
  
  console.log('=' .repeat(30));
  console.log(`📊 Итого:`);
  console.log(`   Всего файлов: ${totalFiles}`);
  console.log(`   Общий размер: ${formatBytes(totalSize)}`);
  console.log(`   Средний размер файла: ${formatBytes(totalSize / totalFiles)}`);
  
  // Сравнение с внешними запросами
  const avgRequestTime = 200; // мс
  const totalRequestTime = totalFiles * avgRequestTime;
  
  console.log(`\n⚡ Преимущества локального хранения:`);
  console.log(`   Экономия времени: ~${(totalRequestTime / 1000).toFixed(1)} сек на загрузку всех флагов`);
  console.log(`   Работа оффлайн: ✅`);
  console.log(`   Стабильная производительность: ✅`);
}

showFlagsInfo();