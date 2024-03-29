#!/usr/bin/env node
import path from "node:path";
import fs from "fs-extra";

import { Command } from "commander";
import type { Logger } from "winston";

import { version } from "../../package.json";
import up from "../core/up";
import { subscribe, downloadMulti } from "../core/index";
import qrcode from "qrcode";
import { appPath, cookiePath, readConfig, writeConfig } from "../core/config";
import { extractBVNumber } from "../utils/index";
import logger from "../utils/log";

import type { DownloadOptions } from "../types/index";

declare global {
  var logger: Logger;
}
global.logger = logger;
process.on("uncaughtException", err => {
  logger.error(err);
});

const program = new Command();
program.name("bili").description("b站命令行").version(version);

program
  .command("login")
  .description("登录b站账号")
  .action(async () => {
    logger.info(`请扫码登录，如果无法登录，`);
    const { url, tv } = await up.login();
    const qrcodePath = path.join(appPath, "qrcode.png");
    qrcode.toFile(qrcodePath, url);
    logger.info(
      `请扫码登录，如果无法登录，请前往打开${qrcodePath}二维码图片进行登录`
    );
    qrcode.toString(url, { type: "terminal", small: true }).then(console.log);
    tv.on("completed", async res => {
      await fs.writeJSON(cookiePath, res.data);
      logger.info("登录信息已保存");
    });
    tv.on("error", err => {
      console.error(err.message);
    });
  });

program
  .command("logout")
  .description("登出账号")
  .action(async () => {
    if (await fs.pathExists(cookiePath)) {
      await fs.remove(cookiePath);
    } else {
      console.error("没有找到登录信息");
    }
  });

program
  .command("download [url]")
  .description("下载视频")
  .option("-o, --output <string>", "输出文件")
  .option("--cid <number>", "视频cid")
  .option("-p, --part <number>", "分p位置，从0开始")
  .option("--all", "下载所有分p")
  .option("--bvid <string>", "视频bvid")
  .option("-vc, --videoCodec <numer>", "7：H264，12：H265，13：AV1")
  .option("-w, --width <number>", "视频宽度")
  .option("-c, --cover", "下载封面")
  .option("-nv, --no-video", "不下载视频")
  .option("-d, --danmaku", "下载弹幕")
  .option("-m, --meta", "下载视频元信息")
  .option("-r, --rewrite", "覆盖已存在的文件")
  .action(async (url: string, options: any) => {
    const params: {
      output?: string;
      ffmpegBinPath?: string;
      cid?: number;
      part?: number;
      bvid: string;
    } = {
      output: options.output,
      ffmpegBinPath: options.bin,
      cid: options.cid ? Number(options.cid) : undefined,
      part: options.part ? Number(options.part) : undefined,
      bvid: options.bvid,
    };
    const mediaOptions: {
      videoCodec?: 7 | 12 | 13;
      resolution?: number;
    } = {
      resolution: options.width,
    };

    if (url) {
      const bvid = extractBVNumber(url);
      if (!bvid) {
        console.error("无法解析视频id");
        return;
      }
      params.bvid = bvid;
    }
    if (options.videoCodec) {
      const videoCodec = Number(options.videoCodec);
      if ([7, 12, 13].includes(videoCodec)) {
        mediaOptions.videoCodec = videoCodec as 7 | 12 | 13;
      }
    }

    if (!params.bvid) {
      console.error("缺少视频id");
      return;
    }

    await downloadMulti(
      {
        output: params.output,
        bvid: params.bvid,
        cover: options.cover,
        video: options.video,
        danmaku: options.danmaku,
        cid: params.cid,
        part: params.part,
        downloadAll: options.all,
        rewrite: options.rewrite,
        meta: options.meta,
      },
      {},
      {
        mediaOptions: mediaOptions,
      },
      {}
    );
  });

const subscribeSubCommand = program
  .command("subscribe")
  .alias("sub")
  .description("订阅");

subscribeSubCommand
  .command("download")
  .description("下载订阅")
  .option("-f, --force", "强制下载，忽略验证")
  .option("--all", "下载所有分p")
  .option("-c, --cover", "下载封面")
  .option("-d, --danmaku", "下载弹幕")
  .option("-m, --meta", "视频信息")
  .option("-nv, --no-video", "不下载视频")
  .action(
    async (
      options: DownloadOptions & {
        force?: boolean;
      }
    ) => {
      const config = await readConfig();
      logger.info(`开始下载订阅，视频将会被保存在${config.downloadPath}文件中`);
      subscribe(options);
    }
  );

subscribeSubCommand
  .command("add")
  .description("添加一个up主到订阅")
  .argument("<number>", "uid")
  .action((uid: number) => {
    up.subscribe(Number(uid));
  });

subscribeSubCommand
  .command("remove")
  .description("移除一个订阅的up主")
  .argument("<number>", "uid")
  .action((uid: string) => {
    up.unSubscribe(Number(uid));
  });

subscribeSubCommand
  .command("list")
  .description("显示所有订阅")
  .action(async () => {
    const data = (await up.list()).map(item => {
      return { uid: item.uid, name: item.name };
    });
    console.table(data);
  });

subscribeSubCommand
  .command("server")
  .description("定时运行sub命令，默认十分钟运行一次")
  .option(
    "-i, --interval <number>",
    "时间间隔，单位分钟，默认10，请勿调整过低，以免撞上风控"
  )
  .option("--all", "下载所有分p")
  .option("-c, --cover", "下载封面")
  .option("-d, --danmaku", "下载弹幕")
  .option("-m, --meta", "视频信息")
  .option("-nv, --no-video", "不下载视频")
  .action(
    async (
      options: DownloadOptions & {
        interval?: number;
      }
    ) => {
      let interval = 10;

      if (options.interval) {
        if (Number.isNaN(Number(options.interval))) {
          console.error("时间间隔必须是数字");
          return;
        } else {
          interval = Number(options.interval);
        }
      }

      subscribe(options);
      setInterval(() => {
        try {
          subscribe(options);
        } catch (err) {
          logger.error(err.message);
        }
      }, 1000 * 60 * interval);
    }
  );

const configSubCommand = program.command("config").description("配置项");
configSubCommand
  .command("print")
  .description("显示配置项")
  .action(async () => {
    const config = await readConfig();
    console.info(config);
  });

configSubCommand
  .command("set")
  .description("设置配置项")
  .argument("<string>", "key")
  .argument("<string>", "value")
  .action(async (key: string, value: string) => {
    // @ts-ignore
    writeConfig(key, value);
  });

program.parse();
