#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
    package: ''
  };

  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p' && i + 1 < args.length) {
      options.package = args[i + 1];
      i++;
      continue;
    }
  }

  return options;
})();

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

delete packageJson.devDependencies;

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
writePackageJson(packageJsonPath, packageJson);
