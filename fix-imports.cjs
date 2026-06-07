const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync('findstr /m /s /c:"lucide-react" "src\\*.tsx" "src\\*.ts"', {encoding: 'utf8'}).trim().split('\r\n');
files.forEach(f => {
  if (!f.trim()) return;
  let content = fs.readFileSync(f, 'utf8');
  
  // Remove `icon` from imports
  content = content.replace(/,\s*icon\b/g, '');
  content = content.replace(/\bicon\s*,/g, '');
  content = content.replace(/\{\s*icon\s*\}/g, '{}');
  
  // Remove Github from imports
  content = content.replace(/,\s*Github\b/g, '');
  content = content.replace(/\bGithub\s*,/g, '');

  fs.writeFileSync(f, content, 'utf8');
});
