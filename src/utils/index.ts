import fs from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";

export function sanitizeFileName(fileName: string) {
  // 定义不允许出现在文件名中的字符
  const invalidChars = ["/", "\\", ":", "*", "?", '"', "<", ">", "|"];

  // 替换不允许的字符为空格
  const sanitizedFileName = fileName.replace(
    new RegExp("[" + invalidChars.join("") + "]", "g"),
    " "
  );

  return sanitizedFileName;
}

export function extractBVNumber(videoUrl: string): string | null {
  const bvMatch = videoUrl.match(/\/BV([A-Za-z0-9]+)/);

  if (bvMatch && bvMatch[1]) {
    return `BV${bvMatch[1]}`;
  } else {
    return null;
  }
}

export const downloadFile = async (
  url: string,
  filePath: string,
  options: RequestInit
) => {
  const res = await fetch(url, options);
  const fileStream = fs.createWriteStream(filePath, { flags: "wx" });
  await finished(Readable.fromWeb(res.body).pipe(fileStream));
};
