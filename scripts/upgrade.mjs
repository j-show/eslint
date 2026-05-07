#!/usr/bin/env node
/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';
import semver from 'semver';

const __dirname = path.join(process.cwd(), 'scripts');

const readPackageJson = fn => {
  try {
    const content = fs.readFileSync(fn, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`错误: 无法读取或解析 package.json: ${error.message}`);
  }

  return null;
};

const writePackageJson = (fn, json) => {
  try {
    const content = JSON.stringify(json, null, 2) + '\n';
    fs.writeFileSync(fn, content, 'utf8');
  } catch (error) {
    console.error(`错误: 无法写入文件: ${error.message}`);
  }
};

const options = (() => {
  const options = {
    package: '',
    version: ''
  };

  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p' && i + 1 < args.length) {
      options.package = args[i + 1];
      i++;
      continue;
    }

    if (args[i] === '-v' && i + 1 < args.length) {
      options.version = args[i + 1];
      i++;
      continue;
    }
  }

  return options;
})();

// 验证 -p 参数
if (!options.package) {
  console.error('错误: 缺少 -p 参数');
  console.error(
    '用法: node upgrade-version.js -p <config|rule> [-v <version>]'
  );
  process.exit(1);
}

if (options.package !== 'config' && options.package !== 'rule') {
  console.error(
    `错误: -p 参数值必须是 "config" 或 "rule"，当前值: ${options.package}`
  );
  process.exit(1);
}

// 构建 package.json 路径
const packageJsonPath = path.join(
  __dirname,
  '../packages',
  options.package,
  'package.json'
);

// 读取 package.json
const packageJson = readPackageJson(packageJsonPath);
if (!packageJson) {
  process.exit(1);
}

// 获取当前版本
const currentVersion = packageJson.version;
if (!currentVersion) {
  console.error('错误: package.json 中未找到 version 字段');
  process.exit(1);
}

// 确定新版本
const newVersion = options.version || semver.inc(currentVersion, 'patch');

// 更新版本
packageJson.version = newVersion;

// 写入文件
writePackageJson(packageJsonPath, packageJson);
console.log(
  `✓ 版本已更新: ${options.package} ${currentVersion} -> ${newVersion}`
);
