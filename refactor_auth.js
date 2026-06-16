const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src', 'app', 'api');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      if (content.includes('decryptSession')) {
        // Replace import
        content = content.replace(/import\s+\{\s*decryptSession\s*\}\s+from\s+["']@\/lib\/session["'];?/g, 'import { getSessionUser } from "@/lib/session";');
        
        const regex1 = /const\s+cookieStore\s*=\s*await\s+cookies\(\);[\s\S]*?if\s*\(\s*payload\s*\)\s*\{\s*authenticatedUserId\s*=\s*payload\.userId;\s*\}\s*\}/;
        if (regex1.test(content)) {
            content = content.replace(regex1, `const payload = await getSessionUser();
    if (payload) {
      authenticatedUserId = payload.userId;
    }`);
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`Refactored: ${fullPath}`);
        } else {
            const regex2 = /const\s+sessionCookie\s*=\s*cookieStore\.get\([^)]+\)\?\.value;[\s\S]*?if\s*\(\s*payload\s*\)\s*\{\s*authenticatedUserId\s*=\s*payload\.userId;\s*\}\s*\}/;
            if (regex2.test(content)) {
               content = content.replace(regex2, `const payload = await getSessionUser();
    if (payload) {
      authenticatedUserId = payload.userId;
    }`);
               content = content.replace(/const\s+cookieStore\s*=\s*await\s+cookies\(\);\n?/g, '');
               fs.writeFileSync(fullPath, content, 'utf8');
               console.log(`Refactored (Regex2): ${fullPath}`);
            } else {
               console.log(`Skipped (Pattern not found): ${fullPath}`);
            }
        }
      }
    }
  }
}

processDir(targetDir);
