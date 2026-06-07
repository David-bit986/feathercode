const fs = require('fs');
const { execSync } = require('child_process');
const files = execSync('findstr /m /s /c:"AlertTriangle" "src\\*.tsx" "src\\*.ts"', {encoding: 'utf8'}).trim().split('\r\n');
files.forEach(f => {
  if (!f.trim()) return;
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/AlertTriangle/g, 'icon');
  fs.writeFileSync(f, content, 'utf8');
});
console.log("Reverted AlertTriangle");
