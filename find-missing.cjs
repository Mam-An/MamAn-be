const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const out = execSync('dir d:\\CNPM\\Garden-Mobie\\garden-mobile\\app /s /b *.tsx *.ts && dir d:\\CNPM\\Garden-Mobie\\garden-mobile\\src /s /b *.tsx *.ts', { encoding: 'utf-8' });
const files = out.split('\r\n').filter(Boolean);

for (const file of files) {
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes('<TouchableOpacity') || content.includes('TouchableOpacity.')) {
      // Check if it's imported
      const hasImport = /import\s+.*{\s*[^}]*TouchableOpacity[^}]*\s*}.*from\s+['"]react-native['"]/.test(content);
      if (!hasImport) {
        console.log('Missing import in:', file);
      }
    }
  }
}
