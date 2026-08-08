// JD-Auction-Search/scripts/bump-version.js v1.5.5
// 同步项目各文件头版本号（package.json / manifest.json / metadata.json / src/*.js 首行）
// 用法: node scripts/bump-version.js [newVersion]
//   - 不传参：仅校验当前版本一致性
//   - 传参：将全部文件同步为新版本
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}
function walkSrc(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkSrc(full, acc);
    else if (e.name.endsWith('.js')) acc.push(full);
  }
}

const pkg = readJson(path.join(ROOT, 'package.json'));
const manifest = readJson(path.join(ROOT, 'manifest.json'));
const metadata = readJson(path.join(ROOT, 'metadata.json'));
const current = pkg.version;

const target = process.argv[2];

if (!target) {
  // 仅校验
  const srcFiles = [];
  walkSrc(path.join(ROOT, 'src'), srcFiles);
  let bad = 0;
  if (manifest.version !== current) { console.error(`❌ manifest ${manifest.version} != ${current}`); bad++; }
  if (metadata.version !== current) { console.error(`❌ metadata ${metadata.version} != ${current}`); bad++; }
  for (const f of srcFiles) {
    const first = fs.readFileSync(f, 'utf8').split('\n')[0];
    if (!first.includes(`v${current}`)) { console.error(`❌ 文件头未同步: ${path.relative(ROOT, f)}`); bad++; }
  }
  if (bad === 0) { console.log(`✅ 版本一致性校验通过: ${current}`); process.exit(0); }
  process.exit(1);
}

// 写入新版本
pkg.version = target;
manifest.version = target;
metadata.version = target;
writeJson(path.join(ROOT, 'package.json'), pkg);
writeJson(path.join(ROOT, 'manifest.json'), manifest);
writeJson(path.join(ROOT, 'metadata.json'), metadata);

const srcFiles = [];
walkSrc(path.join(ROOT, 'src'), srcFiles);
for (const f of srcFiles) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines[0] = lines[0].replace(/v\d+\.\d+\.\d+/, `v${target}`);
  fs.writeFileSync(f, lines.join('\n'), 'utf8');
}
console.log(`✅ 版本已同步为 ${target}（package/manifest/metadata + ${srcFiles.length} 个 src 文件头）`);
