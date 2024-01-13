# 简介

你还在担心你关注的 up 主被删视频吗？这个工具帮助你来自动下载备份视频。

# 安装

# CLI

`bili download` 命令**依赖 ffmpeg**，默认使用环境变量，如果不存在最后会合并会报错，也可以手动传递可执行文件地址

```bash
Usage: bili [options] [command]

b站命令行

Options:
  -V, --version                output the version number
  -h, --help                   display help for command

Commands:
  login                        登录b站账号
  download [options] <number>  下载视频
  subscribe|sub                订阅
  config                       配置项
  help [command]               display help for command
```

```bash
Usage: bili subscribe|sub [options] [command]

订阅

Options:
  -h, --help       display help for command

Commands:
  add <number>     添加一个up主到订阅
  remove <number>  移除一个订阅的up主
  list             显示所有订阅
```

## 配置

支持的配置项有：

1. `downloadPath`: 下载路径，默认为`~/.bili-subscribe/videos`

```bash
Usage: bili config [options] [command]

配置项

Options:
  -h, --help             display help for command

Commands:
  print                  显示配置项
  set <string> <string>  设置配置项
  help [command]         display help for command
```

# 赞赏

如果本项目对你有帮助，请我喝瓶快乐水吧，有助于项目更好维护：[https://afdian.net/a/renmu123](https://afdian.net/a/renmu123)

# 开发

node 需要 18 及以上版本

## Install

```bash
$ pnpm install
```

## Development

```bash
$ pnpm run dev
```

## Build

```bash
$ pnpm run build
```

# License

GPLv3
