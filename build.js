// JD-Auction-Search/build.js v1.6.7
// 构建脚本：校验 manifest → 同步版本号 → 复制资源 → 打包 zip
// 用法：
//   node build.js              默认构建并预览产物
//   node build.js --no-preview 跳过构建产物预览

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const ROOT = __dirname;
const DIST_DIR = path.join(ROOT, 'dist');
const RELEASES_DIR = path.join(ROOT, 'releases');

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const VERSION = manifest.version;

// 根目录随包发布文件
const ROOT_FILES = [
  'manifest.json',
  'metadata.json',
  'README.md',
  'README_EN.md',
  'LICENSE',
  'CHANGELOG.md'
];

// 命令行参数：当前仅 --no-preview 生效
const PREVIEW = !process.argv.slice(2).includes('--no-preview');

// 文件头版本同步：src 各文件首行形如 `// path vX.Y.Z`，构建时统一替换为 manifest.version
const HEADER_RE = /^(\/\/ [^\n]*?\bv)(\d+\.\d+\.\d+)/;

/**
 * 将 JS 源码首行版本号同步为当前构建版本
 * @param {string} raw 原始内容
 * @returns {string}
 */
function syncHeaderVersion(raw) {
  return raw.replace(HEADER_RE, (m, prefix) => prefix + VERSION);
}

/**
 * 递归复制目录，JS 文件写入前同步版本号
 * @param {string} srcDir 源目录
 * @param {string} destDir 目标目录
 * @param {(name: string) => boolean} [filter] 目录过滤器，返回 false 跳过
 */
function copyDirWithVersion(srcDir, destDir, filter) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      if (filter && !filter(entry.name)) continue;
      copyDirWithVersion(srcPath, destPath, filter);
    } else if (entry.name.endsWith('.js')) {
      fs.writeFileSync(destPath, syncHeaderVersion(fs.readFileSync(srcPath, 'utf8')));
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 递归列出目录内文件相对路径（统一用 / 分隔）
 * @param {string} dir 目录绝对路径
 * @param {string} base 相对基准
 * @returns {string[]}
 */
function listFiles(dir, base) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(path.join(dir, entry.name), rel));
    else out.push(rel.split(path.sep).join('/'));
  }
  return out;
}

/**
 * 打印构建产物清单
 * @param {string} dir dist 目录
 */
function previewBuild(dir) {
  const entries = listFiles(dir, '').sort();
  console.log(`\n构建产物预览（${entries.length} 项）:`);
  for (const rel of entries) console.log(`   ${rel}`);
}

/**
 * 校验 manifest 声明的 content_scripts 文件均真实存在，
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
 * 复制全部发布资源到 dist 目录
 */
function assembleDist() {
  if (fs.existsSync(DIST_DIR)) fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  for (const f of ROOT_FILES) {
    const src = path.join(ROOT, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DIST_DIR, f));
  }

  // 复制 src（排除 node_modules）与 _locales（manifest 声明 default_locale，缺则 Chrome 拒绝加载）
  copyDirWithVersion(path.join(ROOT, 'src'), path.join(DIST_DIR, 'src'), (name) => name !== 'node_modules');
  copyDirWithVersion(path.join(ROOT, '_locales'), path.join(DIST_DIR, '_locales'));
}

/**
 * 将 dist 目录打包为 zip
 * @returns {Promise<{file: string, sizeKB: string}>}
 */
function buildZip() {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(RELEASES_DIR, { recursive: true });
    const outputZip = path.join(RELEASES_DIR, `jd-auction-search-v${VERSION}.zip`);
    const output = fs.createWriteStream(outputZip);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve({ file: outputZip, sizeKB: (archive.pointer() / 1024).toFixed(2) }));
    archive.on('warning', (e) => { if (e.code === 'ENOENT') console.warn('警告:', e); else reject(e); });
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(DIST_DIR, false);
    archive.finalize();
  });
}

/**
 * 主流程：校验 → 组装 → 打包 → 预览 → 清理
 */
async function run() {
  console.log('🔨 正在构建插件...');
  verifyManifestScripts();
  assembleDist();
  const { file, sizeKB } = await buildZip();

  console.log('\n✅ 构建成功！');
  console.log(`📦 文件: ${path.relative(ROOT, file)}`);
  console.log(`📊 大小: ${sizeKB} KB`);
  console.log(`🌐 主语言: ${manifest.default_locale || 'zh_CN'}`);
  if (PREVIEW) previewBuild(DIST_DIR);

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  console.log('\n🎉 插件已准备好发布！');
}

run().catch((err) => {
  console.error('\n❌ 构建失败:', err.message);
  process.exitCode = 1;
});
