const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file));
}

function hasPrefix(buffer, bytes) {
  return bytes.every((byte, index) => buffer[index] === byte);
}

const ico = read('src/assets/icon.ico');
const png = read('src/assets/icon.png');
const icns = read('src/assets/icon.icns');

assert(ico.length > 32, 'icon.ico is unexpectedly small');
assert(png.length > 32, 'icon.png is unexpectedly small');
assert(icns.length > 32, 'icon.icns is unexpectedly small');
assert(hasPrefix(ico, [0x00, 0x00, 0x01, 0x00]), 'icon.ico does not have a valid ICO header');
assert(hasPrefix(png, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), 'icon.png does not have a valid PNG header');
assert(hasPrefix(icns, [0x69, 0x63, 0x6E, 0x73]), 'icon.icns does not have a valid ICNS header');

console.log('Icon assets (ico / png / icns) look valid.');
