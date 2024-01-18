import path from "node:path";

import { SingleBar } from "cli-progress";

import fs, { ensureDir } from "fs-extra";
import { Client } from "@renmu/bili-api";
import { sanitizeFileName, downloadFile } from "../utils/index";
import {
  readData,
  pushData,
  readConfig,
  cookiePath,
  deleteData,
} from "./config";

const getClient = async () => {
  const client = new Client();
  if (await fs.exists(cookiePath)) {
    client.loadCookieFile(cookiePath);
  }
  return client;
};

/**
 * 获取用户视频列表
 */
const getMediaList = async (uid: number) => {
  const client = await getClient();
  const data = await client.user.getVideos({
    mid: uid,
    pn: 1,
    ps: 5,
    order: "pubdate",
  });
  return data?.list?.vlist || [];
};

const getVideoInfo = async (bvid: string) => {
  const client = await getClient();

  const data = await client.video.detail({
    bvid,
  });
  return data;
};

/**
 * 下载封面
 * @param bvid
 * @param output
 */
export async function downloadCover(bvid: string, output: string) {
  const data = await getVideoInfo(bvid);
  const coverUrl = data.View.pic;
  console.log(coverUrl);
  await downloadFile(coverUrl, output, {
    headers: {
      Referer: "https://www.bilibili.com/",
    },
  });
  return output;
}

/**
 * 下载视频
 */
export const download = async (
  options: {
    bvid: string;
    output: string;
    cid?: number;
    part?: number;
  },
  mediaOptions: {
    resolution?: number;
    videoCodec?: 7 | 12 | 13;
    audioQuality?: 30216 | 30232 | 30280 | 30250 | 30251;
  } = {}
) => {
  return new Promise(async (resolve, reject) => {
    const config = await readConfig();
    const ffmpegBinPath = config.ffmpegBinPath;
    // 创建进度条实例
    const progressBar = new SingleBar({
      format: "进度 |{bar}| {percentage}% | ETA: {eta}s | {value}/{total}",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
    });
    const total = 100;

    const client = await getClient();
    const downloader = await client.video.download(
      { ...options, ffmpegBinPath },
      mediaOptions
    );
    progressBar.start(total, 0);

    downloader.on("completed", () => {
      progressBar.stop();
      resolve(true);
    });
    downloader.on("error", err => {
      reject(err);
    });
    downloader.on("progress", event => {
      if (event.event === "download") {
        const percentage = Math.floor(event.progress.progress * 100);
        progressBar.update(percentage);
      }
    });
  });
};

/**
 * 订阅用户下载
 */
export const subscribe = async () => {
  const config = await readConfig();
  const downloadPath = config.downloadPath;
  const upList = config.upList;

  let mediaList: {
    uid: number;
    username: string;
    title: string;
    cid: number[];
    bvid: string;
    pic: string;
  }[] = [];
  for (const up of upList) {
    const videoList = (await getMediaList(up.uid)).map((item: any) => {
      return {
        username: up.name,
        uid: up.uid,
        ...item,
      };
    });
    mediaList.push(...videoList);
  }

  const data = await readData();
  mediaList = mediaList.filter(item => !data.find(d => d.bvid === item.bvid));
  let size = 0;
  for (const media of mediaList) {
    const data = await readData();

    const shouldDownload = !data.find(d => d.bvid === media.bvid);

    if (!shouldDownload) continue;
    try {
      logger.info(`正在下载: ${media.title}`);
      const item = {
        uid: media.uid,
        videoName: media.title,
        bvid: media.bvid,
        pic: media.pic,
      };
      await pushData(item);
      const folder = path.join(downloadPath, sanitizeFileName(media.username));
      await ensureDir(folder);
      const filename = sanitizeFileName(`${media.title}.mp4`);

      await download({ bvid: media.bvid, output: path.join(folder, filename) });
      size += 1;
    } catch (err) {
      await deleteData(media.bvid);
      console.error(err.message);
      continue;
    }
  }
  if (size !== 0) {
    logger.info(`本次下载完成，共下载${size}个视频`);
  }
};
