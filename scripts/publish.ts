import path from "node:path";
import { readJSONSync, writeFileSync } from "fs-extra";

import {
  ESLINT_PATH,
  ROOT_PATH,
  cp,
  info,
  mv,
  run,
  step,
  write,
} from "./utils";

const gpkg = readJSONSync(path.join(ROOT_PATH, "package.json"));

process.env ??= {};
process.env.TARGET_NAME = "eslint-plugin-jshow";
process.env.TARGET_VERSION = process.env?.TARGET_VERSION ?? gpkg.version;

const stepBuild = async () => {
  step("\nCleaning...");
  await run("npm", ["run", "clean"]);
  info("Clean success!");

  step("\nBuilding...");
  await run("npm", ["run", "build"], {
    cwd: ESLINT_PATH,
  });
  info("Build success!");
};

const stepGenerate = async () => {
  step(`\nGenerating files...`);
  await mv({
    src: path.join(ESLINT_PATH, "dist"),
    dist: path.join(ROOT_PATH, "dist"),
  });

  await cp(
    {
      src: path.join(ROOT_PATH, "LICENSE"),
      dist: path.join(ROOT_PATH, "dist/LICENSE"),
    },
    {
      src: path.join(ROOT_PATH, "README.md"),
      dist: path.join(ROOT_PATH, "dist/README.md"),
    },
  );
  info("Generate dist success!");

  await write(path.join(ROOT_PATH, "dist/index.js"), (data) =>
    data
      .replace("{TARGET_NAME}", process.env.TARGET_NAME)
      .replace("{TARGET_VERSION}", process.env.TARGET_VERSION),
  );

  const pkg = readJSONSync(path.join(ESLINT_PATH, "package.json"));

  writeFileSync(
    path.join(ROOT_PATH, "dist/package.json"),
    JSON.stringify(
      {
        name: process.env.TARGET_NAME,
        version: process.env.TARGET_VERSION,
        description: gpkg.description,
        license: gpkg.license,
        author: gpkg.author,
        keywords: gpkg.keywords,
        repository: gpkg.repository,
        homepage: gpkg.homepage,
        bugs: gpkg.bugs,
        main: "index.js",
        dependencies: pkg.dependencies,
      },
      null,
      2,
    ),
  );
  info("Generate package.json success!");
};

const main = async () => {
  await stepBuild();

  await stepGenerate();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
