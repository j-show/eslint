#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const semver = require('semver');

const readPackageJson = fn => {
  try {
    const content = fs.readFileSync(fn, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`错误: 无法读取或解析 package.json: ${error.message}`);
  }

  return null;
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

const rootPackageJson = readPackageJson(
  path.join(__dirname, '../package.json')
);
if (!rootPackageJson) {
  console.error('错误: 无法读取 root package.json');
  process.exit(1);
}

packageJson.license = rootPackageJson.license;
packageJson.homepage = rootPackageJson.homepage;
packageJson.repository = rootPackageJson.repository;
packageJson.bugs = rootPackageJson.bugs;

delete packageJson.scripts;
delete packageJson.devDependencies;

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

if (options.package === 'config') {
  const rulePackageJson = readPackageJson(
    path.join(__dirname, '../packages/rule/package.json')
  );

  if (!rulePackageJson) {
    console.error('错误: 无法读取 rule package.json');
    process.exit(1);
  }

  packageJson.dependencies['eslint-plugin-jshow'] = rulePackageJson.version;
}

// 写入文件
try {
  const content = JSON.stringify(packageJson, null, 2) + '\n';
  fs.writeFileSync(packageJsonPath, content, 'utf8');
  console.log(
    `✓ 版本已更新: ${options.package} ${currentVersion} -> ${newVersion}`
  );
} catch (error) {
  console.error(`错误: 无法写入文件: ${error.message}`);
  process.exit(1);
}
