import fs from "fs";
import protobuf from "protobufjs";
import * as xml2js from "xml2js";

// 加载Protobuf定义
protobuf.load("./src/core/dm.proto", async (err, root) => {
  if (err) throw err;

  // 获取消息类型
  const MyMessage = root.lookupType("DmSegMobileReply");

  // 从文件中读取二进制数据
  const buffer = fs.readFileSync("seg.so");

  // 反序列化二进制数据为Protobuf消息
  const message = MyMessage.decode(buffer);

  // 打印反序列化后的消息
  // console.log(message);

  // // 可以将消息转换为JSON格式
  // const jsonMessage = MyMessage.toObject(message, {
  //   defaults: true,
  //   longs: String,
  // });
  // console.log(jsonMessage);

  // // 将Uint8Array转换为XML
  const builder = new xml2js.Builder();
  const xml = builder.buildObject({ MyMessage: MyMessage.toObject(message) });

  console.log(xml);
});
