const fs = require('fs');
const { execSync } = require('child_process');
const files = execSync('findstr /m /s /c:"<icon" "src\\*.tsx" "src\\*.ts"', {encoding: 'utf8'}).trim().split('\r\n');
files.forEach(f => {
  if (!f.trim()) return;
  let content = fs.readFileSync(f, 'utf8');
  
  // Replace <icon ... /> with <Icon ... />
  content = content.replace(/<icon\b/g, '<Icon');
  
  // Find where `icon` is passed as a prop and rename to `Icon` or alias it
  // A common pattern is `function MyComponent({ icon, ... })`
  content = content.replace(/\{([^}]*)\bicon\b([^}]*)\}\s*:/g, (match, p1, p2) => {
    // Only if we don't already have an alias
    if (match.includes('icon:')) return match;
    return `{${p1}icon: Icon${p2}}:`;
  });

  // Another pattern: `const { icon } = props;`
  content = content.replace(/const\s+\{([^}]*)\bicon\b([^}]*)\}\s*=/g, (match, p1, p2) => {
    if (match.includes('icon:')) return match;
    return `const {${p1}icon: Icon${p2}} =`;
  });

  fs.writeFileSync(f, content, 'utf8');
});
console.log('Fixed <icon tags');
