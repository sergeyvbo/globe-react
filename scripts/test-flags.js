const fs = require('fs');
const path = require('path');
const countryCodes = require('../src/Common/GeoData/countryCodes2.json');

// Проверяем наличие всех флагов
function testFlags() {
  const sizes = ['20x15', '64x48'];
  let missingFlags = [];
  let totalFlags = 0;
  
  console.log('Проверяем наличие флагов...\n');
  
  for (const size of sizes) {
    const flagDir = path.join(__dirname, `../public/flags/${size}`);
    
    if (!fs.existsSync(flagDir)) {
      console.error(`❌ Папка ${size} не существует!`);
      continue;
    }
    
    console.log(`📁 Проверяем папку ${size}:`);
    
    for (const country of countryCodes) {
      const flagPath = path.join(flagDir, `${country.code}.png`);
      
      if (!fs.existsSync(flagPath)) {
        missingFlags.push(`${country.code} (${size})`);
        console.log(`  ❌ Отсутствует: ${country.code}.png`);
      } else {
        totalFlags++;
      }
    }
    
    const existingCount = countryCodes.length - missingFlags.filter(f => f.includes(size)).length;
    console.log(`  ✅ Найдено: ${existingCount}/${countryCodes.length} флагов\n`);
  }
  
  console.log('='.repeat(50));
  console.log(`📊 Итого:`);
  console.log(`✅ Всего флагов: ${totalFlags}`);
  console.log(`❌ Отсутствует: ${missingFlags.length}`);
  
  if (missingFlags.length > 0) {
    console.log(`\n🔍 Отсутствующие флаги:`);
    missingFlags.forEach(flag => console.log(`  - ${flag}`));
    console.log(`\n💡 Запустите: npm run download-flags`);
  } else {
    console.log(`\n🎉 Все флаги на месте!`);
  }
}

testFlags();