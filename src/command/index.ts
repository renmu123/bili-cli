import { Command } from "commander";
import { version } from "../../package.json";
import up from "../core/up";
// import qrcode from "qrcode-terminal";

const program = new Command();
program.name("bili-subsribe").description("b站up订阅").version(version);

program
  .command("add")
  .description("添加一个up主到订阅")
  .argument("<number>", "uid")
  .action((uid: number) => {
    up.subscribe(uid);
  });

program
  .command("remove")
  .description("移除一个订阅的up主")
  .argument("<number>", "uid")
  .action((uid: number) => {
    up.unSubscribe(uid);
  });

program
  .command("login")
  .description("登录b站账号")
  .action(async () => {
    // const { url, tv } = await up.login();
    // console.log(url);
    // console.log("请扫码登录，如果无法登录，请手动打开二维码图片进行登录");
    // qrcode.generate(url);
    // up.unSubscribe(uid);
  });

program.parse();
