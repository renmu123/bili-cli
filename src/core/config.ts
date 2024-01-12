import os from "node:os";
import path from "node:path";
import fs from "fs-extra";

export const appPath = path.join(os.homedir(), ".bili-subscribe");
export const configPath = path.join(appPath, "config.json");

fs.ensureDir(appPath);

interface Config {
  upList: {
    uid: number;
    name: string;
    avatar: string;
  }[];
}

const defaultConfig: Config = {
  upList: [],
};

export const readConfig = async (): Promise<Config> => {
  if (!(await fs.pathExists(configPath))) {
    await fs.writeJSON(configPath, defaultConfig);
  }
  const config = await fs.readJSON(configPath);

  return {
    ...defaultConfig,
    ...config,
  };
};

export const writeConfig = async <K extends keyof Config>(
  key: K,
  value: Config[K]
) => {
  const config = await readConfig();
  config[key] = value;
  await fs.writeJSON(configPath, config);
};
