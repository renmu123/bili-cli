import path from "node:path";

import { SingleBar } from "cli-progress";

import fs, { ensureDir } from "fs-extra";
import { Client, utils } from "@renmu/bili-api";
import { sanitizeFileName, downloadFile } from "../utils/index";
import {
  readData,
  pushData,
  readConfig,
  cookiePath,
  deleteData,
} from "./config";

import type { DownloadOptions } from "../types/index";

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

async function normalizePath(
  file: string | undefined,
  downloadPath: string,
  defaultName: string,
  ext: string
) {
  let output = "";
  if (!file) {
    output = path.join(downloadPath, sanitizeFileName(defaultName));
  } else {
    const { dir, name } = path.parse(file);
    if (path.isAbsolute(file)) {
      output = path.join(dir, sanitizeFileName(`${name}.${ext}`));
    } else {
      output = path.join(downloadPath, sanitizeFileName(`${name}.${ext}`));
    }
  }

  const { dir } = path.parse(output);
  await ensureDir(dir);

  return output;
}

/**
 * 下载视频,封面,弹幕
 */
export async function downloadMulti(
  options: {
    output?: string;
    bvid: string;
    cover?: boolean;
    video?: boolean;
    danmaku?: boolean;
    cid?: number;
    part?: number;
    downloadAll?: boolean;
    rewrite?: boolean;
    meta?: boolean;
  },
  coverOptions: {
    output?: string;
  } = {},
  videoOptions: {
    output?: string;

    mediaOptions?: {
      resolution?: number;
      videoCodec?: 7 | 12 | 13;
      audioQuality?: 30216 | 30232 | 30280 | 30250 | 30251;
    };
  } = {},
  danmakuOptions: {
    output?: string;
    xml?: boolean;
  } = {}
) {
  const config = await readConfig();
  const videoInfo = await getVideoInfo(options.bvid);
  const videoTitle = sanitizeFileName(videoInfo.View.title);
  // console.log(videoInfo);

  if (options.meta) {
    const output = await normalizePath(
      options.output,
      config.downloadPath,
      `${videoTitle}`,
      "json"
    );
    if (!(await fs.pathExists(output)) || options.rewrite) {
      logger.info(`开始下载元数据，将会保存在：${output}`);
      await fs.promises.writeFile(output, JSON.stringify(videoInfo.View));
    } else {
      logger.info(`元数据已存在，跳过下载`);
    }
  }

  if (options.cover) {
    const output = await normalizePath(
      coverOptions.output || options.output,
      config.downloadPath,
      `${videoTitle}`,
      "png"
    );
    if (!(await fs.pathExists(output)) || options.rewrite) {
      logger.info(`开始下载封面，将会保存在：${output}`);
      await downloadCover(videoInfo.View.pic, output).catch(err => {
        logger.error("封面下载失败");
        logger.error(err);
      });
    } else {
      logger.info(`封面已存在，跳过下载`);
    }
  }

  const cids = [];
  if (!options.cid) {
    const pages = videoInfo.View?.pages || [];
    let page = pages[options.part || 0];
    if (!page) throw new Error("不存在符合要求的视频");

    options.cid = page.cid;
    cids.push(page.cid);
  }
  if (options.downloadAll) {
    const pages = videoInfo.View?.pages || [];
    for (const page of pages) {
      cids.push(page.cid);
    }
  }
  for (let i = 0; i < cids.length; i++) {
    if (options.video) {
      let output = "";
      if (i === 0) {
        output = await normalizePath(
          videoOptions.output || options.output,
          config.downloadPath,
          `${videoTitle}`,
          "mp4"
        );
      } else {
        output = await normalizePath(
          videoOptions.output || options.output,
          config.downloadPath,
          `${videoTitle}-P${i}`,
          "mp4"
        );
      }
      const params = {
        bvid: options.bvid,
        output: output,
        cid: options.cid,
      };
      if (!(await fs.pathExists(output)) || options.rewrite) {
        logger.info(`开始下载视频，将会保存在：${output}`);

        await downloadVideo(params, videoOptions.mediaOptions).catch(err => {
          logger.error("视频下载失败");
          logger.error(err);
        });
      } else {
        logger.info(`视频已存在，跳过下载`);
      }
    }
    if (options.danmaku) {
      let output = "";
      if (i === 0) {
        output = await normalizePath(
          danmakuOptions.output || options.output,
          config.downloadPath,
          `${videoTitle}`,
          "xml"
        );
      } else {
        output = await normalizePath(
          danmakuOptions.output || options.output,
          config.downloadPath,
          `${videoTitle}-P${i}`,
          "xml"
        );
      }
      if (!(await fs.pathExists(output)) || options.rewrite) {
        logger.info(`开始下载弹幕，将会保存在：${output}`);
        logger.info(`开始下载弹幕，将会保存在：${output}`);

        logger.info(`开始下载弹幕，将会保存在：${output}`);

        await downloadDanmaku(options.cid, output, 1).catch(err => {
          logger.error("弹幕下载失败");
          logger.error(err);
        });
      } else {
        logger.info(`弹幕已存在，跳过下载`);
      }
    }
  }
}

/**
 * 下载封面
 * @param bvid
 * @param output
 */
export async function downloadCover(coverUrl: string, output: string) {
  await downloadFile(coverUrl, output, {
    headers: {
      Referer: "https://www.bilibili.com/",
    },
  });
  return output;
}

/**
 * 下载弹幕
 */
export async function downloadDanmaku(
  cid: number,
  output: string,
  totalIndex: number
) {
  const client = await getClient();
  const buffers = [];
  for (let i = 1; i <= totalIndex; i++) {
    const buffer = await client.video.getDm({ cid, segment_index: i });
    buffers.push(buffer);
  }
  let combined = Buffer.concat(buffers);
  const xmlContent = await utils.protoBufToXml(combined);
  await fs.promises.writeFile(output, xmlContent);
}

/**
 * 下载视频
 */
export const downloadVideo = async (
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
export const subscribe = async (
  options: DownloadOptions & {
    force?: boolean;
  }
) => {
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

  let size = 0;
  for (const media of mediaList) {
    const data = await readData();
    if (!options.force) {
      const shouldDownload = !data.find(d => d.bvid === media.bvid);
      if (!shouldDownload) continue;
    }
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

      await downloadMulti({
        bvid: media.bvid,
        output: path.join(folder, filename),
        ...options,
      });
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
