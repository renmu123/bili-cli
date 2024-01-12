import path from "node:path";

import { Client, TvQrcodeLogin } from "@renmu/bili-api";
import { readConfig, writeConfig, appPath } from "./config";
import fs from "fs-extra";

const getUserInfo = async (uid: number) => {
  const client = new Client();
  const data = await client.user.getUserInfo(uid);
  return data;
};

export const login = async () => {
  const tv = new TvQrcodeLogin();
  const url = await tv.login();
  console.log(url);

  tv.on("completed", (res) => {
    console.log("completed", res);
    fs.writeJSON(path.join(appPath, "cookie.json"), res.data);
  });
  return { url, tv };
};

const subscribe = async (uid: number) => {
  const config = await readConfig();
  const data = await getUserInfo(uid);
  const item = {
    uid: data.mid,
    name: data.name,
    avatar: data.face,
  };

  config.upList.push(item);
  await writeConfig("upList", config.upList);
};
const unSubscribe = async (uid: number) => {
  const config = await readConfig();
  config.upList = config.upList.filter((item) => item.uid !== uid);
  await writeConfig("upList", config.upList);
};

export default {
  subscribe,
  unSubscribe,
  login,
};
