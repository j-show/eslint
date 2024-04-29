import path from "node:path";
import fs from "node:fs";
import chalk from "chalk";
import execa from "execa";
import { copy, move, CopyOptions, MoveOptions } from "fs-extra";

export const ROOT_PATH = path.join(__dirname, "..");
export const ESLINT_PATH = path.join(ROOT_PATH, "packages/eslint");

export const step = (msg: string) => console.log(chalk.cyan(msg));

export const info = (msg: string) => console.log(chalk.green(msg));

export const run = async (
  cmd: string,
  args: string[],
  opts: Record<string, unknown> = {},
) => {
  return execa(cmd, args, {
    stdio: "inherit",
    cwd: ROOT_PATH,
    ...process.env,
    ...opts,
  });
};

export const cp = async (
  ...opts: Array<{ src: string; dist: string; opts?: CopyOptions }>
) => {
  return Promise.all(opts.map((o) => copy(o.src, o.dist, o.opts)));
};

export const mv = async (
  ...opts: Array<{ src: string; dist: string; opts?: MoveOptions }>
) => {
  return Promise.all(opts.map((o) => move(o.src, o.dist, o.opts)));
};

export const write = async (
  src: string,
  callback: (data: string) => string,
) => {
  let file = fs.readFileSync(src, { encoding: "utf-8" });
  file = callback(file);

  fs.writeFileSync(src, file, "utf-8");
};
