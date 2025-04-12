const fs = require('fs');
const path = require('path');

// Các file HTML cần sửa
const htmlFiles = [
  'popup.html',
  'options.html',
  'history.html',
  'blocked.html'
];

// Đường dẫn thư mục dist
const distDir = path.resolve(__dirname, '../dist');

// Xử lý mỗi file HTML
htmlFiles.forEach(file => {
  const filePath = path.join(distDir, file);
  
  // Kiểm tra xem file có tồn tại
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Sửa đường dẫn TypeScript thành JavaScript
    content = content.replace(
      /<script type="module" src="\.\.\/src\/(.+?)\/index\.ts"><\/script>/g,
      '<script type="module" src="$1/index.js"></script>'
    );
    
    // Sửa đường dẫn CSS để trỏ tới đúng vị trí
    content = content.replace(
      /<link rel="stylesheet" href="(popup|options)\.css">/g,
      '<link rel="stylesheet" href="styles/$1.css">'
    );
    
    // Ghi lại file
    fs.writeFileSync(filePath, content);
    console.log(`Fixed paths in ${file}`);
  } else {
    console.warn(`Warning: ${file} not found in dist directory`);
  }
});

// Copy CSS files nếu cần
const ensureCssDir = path.join(distDir, 'styles');
if (!fs.existsSync(ensureCssDir)) {
  fs.mkdirSync(ensureCssDir, { recursive: true });
}

const cssFiles = ['popup.css', 'options.css'];
const publicStylesDir = path.resolve(__dirname, '../public/styles');

if (fs.existsSync(publicStylesDir)) {
  cssFiles.forEach(cssFile => {
    const sourceFile = path.join(publicStylesDir, cssFile);
    const destFile = path.join(ensureCssDir, cssFile);
    
    if (fs.existsSync(sourceFile) && !fs.existsSync(destFile)) {
      fs.copyFileSync(sourceFile, destFile);
      console.log(`Copied ${cssFile} to dist/styles`);
    }
  });
}

console.log('HTML path fixing completed'); 