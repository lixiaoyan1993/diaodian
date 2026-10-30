import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(process.cwd());
const distDir = path.join(rootDir, 'dist', 'build', 'mp-weixin');
const distConfigPath = path.join(distDir, 'project.config.json');
const rootConfigPath = path.join(rootDir, 'project.config.json');
const manifestPath = path.join(rootDir, 'src', 'manifest.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildCondition() {
  return {
    search: { current: -1, list: [] },
    conversation: { current: -1, list: [] },
    game: { current: -1, list: [] },
    miniprogram: { current: -1, list: [] },
  };
}

function main() {
  if (!fs.existsSync(distDir)) {
    console.warn('[fix-mp-project-config] dist/build/mp-weixin not found, skipped.');
    return;
  }

  const rootConfig = fs.existsSync(rootConfigPath) ? readJson(rootConfigPath) : {};
  const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : {};
  const mpWeixin = manifest['mp-weixin'] || {};

  const config = {
    description: manifest.description || '钓鱼标点记录工具',
    packOptions: rootConfig.packOptions || { ignore: [], include: [] },
    setting: {
      urlCheck: true,
      es6: true,
      postcss: true,
      minified: true,
      enhance: true,
      ...(rootConfig.setting || {}),
    },
    compileType: rootConfig.compileType || 'miniprogram',
    simulatorPluginLibVersion: rootConfig.simulatorPluginLibVersion || {},
    libVersion: '',
    appid: mpWeixin.appid || rootConfig.appid || '',
    projectname: manifest.name || '鱼标点',
    editorSetting: rootConfig.editorSetting || {},
    condition: buildCondition(),
    testRoot: 'minitest/',
  };

  fs.writeFileSync(distConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  console.log('[fix-mp-project-config] project.config.json repaired.');
}

main();
