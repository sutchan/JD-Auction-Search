// JD-Auction-Search/scripts/bump-version.js v1.5.5
// 版本同步：把所有源文件头部注释的 vX.Y.Z 统一为 package.json 的 version

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VERSION = require(path.join(ROOT, 'package.json')).version;
const HEADER_RE = /^(\/\/\s*\S+\s+v)(\d+\.\d+\.\d+)/;

/**
 * 递归收集目录下的 .js 文件
 * @param {string} dir - 目录绝对路径
 * @returns {string[]}
 */
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : (full.endsWith('.js') ? [full] : []);
  });
}

const targets = [
  ...walk(path.join(ROOT, 'src')),
  path.join(ROOT, 'background.js'),
  path.join(ROOT, 'build.js')
];

let changed = 0;
for (const file of targets) {
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(HEADER_RE);
  if (!m || m[2] === VERSION) continue;
  fs.writeFileSync(file, src.replace(HEADER_RE, `$1${VERSION}`), 'utf8');
  changed++;
  console.log('bump', path.relative(ROOT, file));
}
console.log(`version=${VERSION} changed=${changed}`);
