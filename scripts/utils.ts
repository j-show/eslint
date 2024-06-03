import path from 'node:path';
import fs from 'node:fs';
import chalk from 'chalk';
import execa from 'execa';
import { remove, copy, move, readJSONSync, writeFileSync } from 'fs-extra';

export const ROOT_PATH = path.join(__dirname, '..');

export const ROOT_PKG = readJSONSync(path.join(ROOT_PATH, 'package.json'));

const step = (msg: string) => console.log(chalk.cyan(msg));

const info = (msg: string) => console.log(chalk.green(msg));

const run = async (
  cmd: string,
  args: string[],
  opts: Record<string, unknown> = {}
) => {
  return execa(cmd, args, {
    stdio: 'inherit',
    cwd: ROOT_PATH,
    ...opts
  });
};

const write = async (src: string, callback: (data: string) => string) => {
  let file = fs.readFileSync(src, { encoding: 'utf-8' });
  file = callback(file);

  fs.writeFileSync(src, file, 'utf-8');
};

const build = async (cwd: string, dist: string, name: string, vers: string) => {
  step(`\n=== ${name}@${vers} ===`);

  step('\nCleaning...');
  await remove(dist);
  await remove(path.join(cwd, 'dist'));
  info('Clean success!');

  step('\nBuilding...');
  await run('npm', ['run', 'build'], { cwd });
  info('Build success!');
};

const generate = async (
  cwd: string,
  dist: string,
  name: string,
  version: string,
  callback?: (pkg: Record<string, unknown>) => Record<string, unknown>
) => {
  step(`\nGenerating files...`);

  await move(path.join(cwd, 'dist'), dist);
  await copy(path.join(ROOT_PATH, 'LICENSE'), path.join(dist, 'LICENSE'));
  await copy(path.join(ROOT_PATH, 'README.md'), path.join(dist, 'README.md'));

  info('Generate dist success!');

  await write(path.join(dist, 'index.js'), data =>
    data.replace('{TARGET_NAME}', name).replace('{TARGET_VERSION}', version)
  );

  const pkg = readJSONSync(path.join(cwd, 'package.json'));
  const opts = callback?.(pkg) ?? {};

  writeFileSync(
    path.join(dist, 'package.json'),
    JSON.stringify(
      {
        name,
        version,
        description: ROOT_PKG.description,
        license: ROOT_PKG.license,
        author: ROOT_PKG.author,
        keywords: pkg.keywords ?? ROOT_PKG.keywords ?? [],
        repository: ROOT_PKG.repository,
        homepage: ROOT_PKG.homepage,
        bugs: ROOT_PKG.bugs,
        main: 'index.js',
        dependencies: pkg.dependencies ?? {},
        peerDependencies: pkg.peerDependencies ?? {},
        ...opts
      },
      null,
      2
    )
  );
  info('Generate package.json success!');
};

const main = async (folderName: string, pkgName: string, pkgVers: string) => {
  const ROOT_DIST = path.join(ROOT_PATH, 'dist', pkgName);
  const ROOT_CWD = path.join(ROOT_PATH, 'packages', folderName);

  await build(ROOT_CWD, ROOT_DIST, pkgName, pkgVers);

  await generate(ROOT_CWD, ROOT_DIST, pkgName, pkgVers);
};

export const buildPackage = (
  folderName: string,
  pkgName: string,
  pkgVers: string
) => {
  main(folderName, pkgName, pkgVers).catch(err => {
    console.error(err);
    process.exit(1);
  });
};
