const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync('findstr /m /s /c:"@hugeicons/react" "src\\*.tsx" "src\\*.ts"', {encoding: 'utf8'}).trim().split('\r\n');
const icons = new Set();

files.forEach(f => {
  if (!f.trim()) return;
  const content = fs.readFileSync(f, 'utf8');
  const match = content.match(/import\s+\{([^}]+)\}\s+from\s+["']@hugeicons\/core-free-icons["']/);
  if (match) {
    match[1].split(',').forEach(i => {
      const name = i.trim();
      if (name) icons.add(name);
    });
  }
});

console.log(Array.from(icons).sort().join('\n'));
