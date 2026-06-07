const potrace = require('potrace');
const fs = require('fs');
const path = require('path');

const inputPath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\dd4354ad-1044-4083-bd0e-e1ade1526163\\media__1780688940799.jpg';
const outputPath = 'C:\\Users\\DELL\\Desktop\\MEP V2\\public\\assets\\signature.svg';

console.log('Tracing signature from:', inputPath);

const params = {
  background: 'transparent',
  color: 'currentColor', // Allows CSS color changes
  threshold: 120
};

potrace.trace(inputPath, params, function(err, svg) {
  if (err) {
    console.error('Error tracing image:', err);
    process.exit(1);
  }
  
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, svg);
  console.log('Successfully wrote SVG signature to:', outputPath);
});
