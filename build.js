const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 获取版本号
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const version = manifest.version;
const outputFileName = `jd-auction-search-v${version}.zip`;

// 清理旧的压缩文件
if (fs.existsSync(outputFileName)) {
  fs.unlinkSync(outputFileName);
  console.log(`已删除旧文件: ${outputFileName}`);
}

// 创建输出流
const output = fs.createWriteStream(outputFileName);
const archive = archiver('zip', {
  zlib: { level: 9 } // 最高压缩级别
});

// 监听完成事件
output.on('close', () => {
  const fileSize = (archive.pointer() / 1024).toFixed(2);
  console.log(`\n✅ 构建成功！`);
  console.log(`📦 文件: ${outputFileName}`);
  console.log(`📊 大小: ${fileSize} KB`);
  console.log(`\n🎉 插件已准备好发布！`);
});

// 监听警告
archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn('警告:', err);
  } else {
    throw err;
  }
});

// 监听错误
archive.on('error', (err) => {
  throw err;
});

// 将归档输出到文件
archive.pipe(output);

console.log('🔨 正在构建插件...');

// 添加必要的文件
const filesToAdd = [
  'manifest.json',
  'metadata.json',
  'background.js',
  'LICENSE',
  'README.md'
];

const directoriesToAdd = [
  'src',
  '_locales'
];

// 添加单个文件
filesToAdd.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`📄 添加文件: ${file}`);
    archive.file(file, { name: file });
  }
});

// 添加目录
directoriesToAdd.forEach(dir => {
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    console.log(`📁 添加目录: ${dir}`);
    archive.directory(dir, dir);
  }
});

// 有选择地添加 icons 目录（如果存在）
if (fs.existsSync('icons') && fs.statSync('icons').isDirectory()) {
  console.log(`🖼️  添加图标目录: icons`);
  archive.directory('icons', 'icons');
}

// 完成归档
archive.finalize();
