const fs = require('fs');
const content = fs.readFileSync('services/worldConsistencyService.ts', 'utf8');
let open = 0;
let close = 0;
for (const char of content) {
  if (char === '{') open++;
  if (char === '}') close++;
}
console.log('Open braces:', open);
console.log('Close braces:', close);
console.log('Difference:', open - close);

if (open > close) {
  fs.appendFileSync('services/worldConsistencyService.ts', '\n}'.repeat(open - close));
  console.log('Added missing closing braces');
}
