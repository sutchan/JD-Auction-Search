// JD-Auction-Search/build.js v1.5.5
// 构建脚本：打包扩展为 zip 发布包（zh_CN + en 单包）
// 用法：
//   node build.js              默认构建
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

/**
 * 同步单个 JS 文件头部版本号
 * @param {string} raw - 文件原始内容
 * @returns {string} 版本已同步的内容
 */
function syncHeader(raw) {
  return raw.replace(HEADER_RE, (m, prefix) => prefix + VERSION);
}

// 解析命令行参数（当前仅 --no-preview 生效；扩展仅打包 zh_CN + en 单包）
const args = process.argv.slice(2);
const PREVIEW = !args.includes('--no-preview');

const OUTPUT_ZIP = path.join(ROOT, 'releases', `jd-auction-search-v${VERSION}.zip`);

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

/**
 * 重建干净的 dist 目录
 */
function ensureDist() {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

/**
 * 递归复制目录（JS 文件同步版本号）
 * @param {string} srcDir - 源目录
 * @param {string} destDir - 目标目录
 * @param {Function} [filter] - 目录名过滤器，返回 false 时跳过
 */
function copyDir(srcDir, destDir, filter) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      if (filter && !filter(entry.name)) continue;
      copyDir(srcPath, destPath, filter);
    } else if (entry.name.endsWith('.js')) {
      fs.writeFileSync(destPath, syncHeader(fs.readFileSync(srcPath, 'utf8')));
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 递归列出目录下所有文件的相对路径
 * @param {string} dir - 目录绝对路径
 * @param {string} base - 相对基准路径
 * @returns {string[]}
 */
function listFiles(dir, base) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, e.name);
    if (e.isDirectory()) out.push(...listFiles(path.join(dir, e.name), rel));
    else out.push(rel.split(path.sep).join('/'));
  }
  return out;
}

/**
 * 打印构建产物清单
 * @param {string} dir - dist 目录
 */
function previewBuild(dir) {
  const entries = listFiles(dir, '').sort();
  console.log(`\n构建产物预览（${entries.length} 项）:`);
  for (const rel of entries) {
    console.log(`   ${rel}`);
  }
}

/**
 * 校验 manifest 声明的 content_scripts 文件均真实存在
 * 拆分模块后漏登记/漏改路径会导致扩展加载失败，构建期提前拦截
 */
function verifyManifestScripts() {
  const scripts = (manifest.content_scripts || []).flatMap(cs => cs.js || []);
  const missing = scripts.filter(rel => !fs.existsSync(path.join(ROOT, rel)));
  if (missing.length) {
    throw new Error('manifest.content_scripts 引用了不存在的文件:\n  ' + missing.join('\n  '));
  }
  console.log(`✔ manifest 脚本校验通过（${scripts.length} 个文件）`);
}

/**
 * 执行构建：复制资源 → 校验 → 打 zip
 */
function build() {
  verifyManifestScripts();
  ensureDist();

  // 1. 复制根目录文件
  for (const f of ROOT_FILES) {
    const src = path.join(ROOT, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DIST_DIR, f));
  }

  // 2. 复制 src 目录（保持相对结构，排除 node_modules）
  copyDir(path.join(ROOT, 'src'), path.join(DIST_DIR, 'src'), (name) => name !== 'node_modules');

  // 2.1 复制 _locales：manifest 声明了 default_locale，缺 _locales 会导致
  // Chrome 拒绝加载扩展（硬校验），必须随包发布
  copyDir(path.join(ROOT, '_locales'), path.join(DIST_DIR, '_locales'));

  // 3. 打包 zip（输出到 releases/ 目录，构建前确保目录存在）
  fs.mkdirSync(path.dirname(OUTPUT_ZIP), { recursive: true });
  const output = fs.createWriteStream(OUTPUT_ZIP);
  const archive = archiver('zip', { zlib: { level: 9 } });
  output.on('close', () => {
    const sizeKB = (archive.pointer() / 1024).toFixed(2);
    console.log('\n✅ 构建成功！');
    console.log(`📦 文件: ${path.relative(ROOT, OUTPUT_ZIP)}`);
    console.log(`📊 大小: ${sizeKB} KB`);
    console.log(`🌐 主语言: ${manifest.default_locale || 'zh_CN'}`);
    if (PREVIEW) previewBuild(DIST_DIR);
    // 清理临时构建目录
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
    console.log('\n🎉 插件已准备好发布！');
  });
  archive.on('warning', (e) => { if (e.code === 'ENOENT') console.warn('警告:', e); else throw e; });
  archive.on('error', (e) => { throw e; });
  archive.pipe(output);
  archive.directory(DIST_DIR, false);
  archive.finalize();
}

console.log('🔨 正在构建插件...');
build();
