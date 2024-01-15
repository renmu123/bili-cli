import winston from "winston";
import { logPath } from "../core/config";

const { combine, timestamp, printf } = winston.format;
const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = winston.createLogger({
  level: "info",
  format: combine(timestamp(), myFormat),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    new winston.transports.File({ filename: logPath, level: "error" }),
  ],
});

// export const setLogLevel = (level: string) => {
//   logger.level = level;
// };
//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
// if (process.env.NODE_ENV !== "production") {
//   logger.add(
//     new winston.transports.Console({
//       format: winston.format.simple(),
//     })
//   );
// }

Object.assign(console, logger);
// console.log = logger.info;

export default logger;
