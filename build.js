// JD-Auction-Search/build.js v1.4.0
// 构建脚本：打包扩展为 zip 发布包
// 设计原则：默认打包 zh-CN，遵循 Chrome Web Store 规范（_locales 含多语言，浏览器按区域自动选择）
// 用法：
//   node build.js           默认构建（zh-CN）
//   node build.js --tw      以 zh-TW 本地化命名输出（jd-auction-search-vX.Y.Z-zh-TW.zip）
//   node build.js --firefox 对 messages.json 做 Firefox 字符串转义（' -> \'、\ -> \\）
//   node build.js --no-preview 跳过构建产物预览

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 跨平台路径处理（Linux 兼容：统一使用 path.join / path.sep）
const ROOT = __dirname;
const DIST_DIR = path.join(ROOT, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const VERSION = manifest.version;

// 文件头版本同步：src 各文件首行形如 `// path vX.Y.Z`，构建时统一替换为 manifest.version，
// 避免手动同步多文件版本号漏改（仅替换首行匹配，不动正文）
const HEADER_RE = /^(\/\/ [^\n]*?\bv)(\d+\.\d+\.\d+)/;
function syncHeader(raw, relPath) {
  return raw.replace(HEADER_RE, (m, p, old) => p + VERSION);
}

// 解析命令行参数
const args = process.argv.slice(2);
const BUILD_LOCALE = args.includes('--tw') ? 'zh-TW' : 'zh-CN';
const FIREFOX = args.includes('--firefox');
const PREVIEW = !args.includes('--no-preview');

const localeSuffix = BUILD_LOCALE === 'zh-TW' ? '-zh-TW' : '';
const OUTPUT_ZIP = path.join(ROOT, `jd-auction-search-v${VERSION}${localeSuffix}.zip`);

// 打包根目录文件（排除开发与构建产物）
const ROOT_FILES = [
  'manifest.json',
  'metadata.json',
  'background.js',
  'README.md',
  'README_EN.md',
  'LICENSE',
  'CHANGELOG.md'
];

function ensureDist() {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Firefox 的 messages.json 要求单引号转义为 \'、反斜杠转义为 \\
function escapeFirefoxMessages(raw) {
  const obj = JSON.parse(raw);
  for (const key of Object.keys(obj)) {
    const entry = obj[key];
    if (entry && typeof entry.message === 'string') {
      entry.message = entry.message.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }
  }
  return JSON.stringify(obj, null, 2);
}

function copyDir(srcDir, destDir, filter) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      if (filter && !filter(entry.name)) continue;
      copyDir(srcPath, destPath, filter);
    } else {
      // 对 JS 文件同步文件头版本号
      if (entry.name.endsWith('.js')) {
        const raw = fs.readFileSync(srcPath, 'utf8');
        fs.writeFileSync(destPath, syncHeader(raw, srcPath));
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

function processLocaleDir(localeDir, destRoot) {
  const src = path.join(ROOT, '_locales', localeDir);
  if (!fs.existsSync(src)) return;
  const dest = path.join(destRoot, '_locales', localeDir);
  fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    if (f.endsWith('.json')) {
      const raw = fs.readFileSync(path.join(src, f), 'utf8');
      const out = FIREFOX ? escapeFirefoxMessages(raw) : raw;
      fs.writeFileSync(path.join(dest, f), out);
    }
  }
}

function listFiles(dir, base) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, e.name);
    if (e.isDirectory()) out.push(...listFiles(path.join(dir, e.name), rel));
    else out.push(rel.split(path.sep).join('/'));
  }
  return out;
}

function previewBuild(dir) {
  const entries = listFiles(dir, '').sort();
  console.log(`\n📂 构建产物预览（${entries.length} 项）:`);
  for (const rel of entries) {
    console.log(`   ${rel}`);
  }
}

function build() {
  ensureDist();

  // 1. 复制根目录文件
  for (const f of ROOT_FILES) {
    const src = path.join(ROOT, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DIST_DIR, f));
  }

  // 2. 复制 src 目录（保持相对结构，排除 node_modules）
  copyDir(path.join(ROOT, 'src'), path.join(DIST_DIR, 'src'), (name) => name !== 'node_modules');

  // 3. 处理多语言（默认 zh-CN；Chrome 按浏览器区域自动回退 zh_TW，无需单独打包）
  processLocaleDir('zh_CN', DIST_DIR);
  processLocaleDir('zh_TW', DIST_DIR);

  // 4. 打包 zip
  const output = fs.createWriteStream(OUTPUT_ZIP);
  const archive = archiver('zip', { zlib: { level: 9 } });
  output.on('close', () => {
    const sizeKB = (archive.pointer() / 1024).toFixed(2);
    console.log(`\n✅ 构建成功！`);
    console.log(`📦 文件: ${path.relative(ROOT, OUTPUT_ZIP)}`);
    console.log(`📊 大小: ${sizeKB} KB`);
    console.log(`🌐 主语言: ${BUILD_LOCALE}${FIREFOX ? ' (Firefox 转义)' : ''}`);
    if (PREVIEW) previewBuild(DIST_DIR);
    // 清理临时构建目录
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
    console.log(`\n🎉 插件已准备好发布！`);
  });
  archive.on('warning', (e) => { if (e.code === 'ENOENT') console.warn('警告:', e); else throw e; });
  archive.on('error', (e) => { throw e; });
  archive.pipe(output);
  archive.directory(DIST_DIR, false);
  archive.finalize();
}

console.log('🔨 正在构建插件...');
build();
