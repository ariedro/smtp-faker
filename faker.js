const net = require("net");
const { spawn } = require("child_process");
const simpleParser = require("mailparser").simpleParser;
const TelegramBot = require("node-telegram-bot-api");
const config = require("./config.json");

const bot = new TelegramBot(config.tg.token);

let handlingData = false;
let fileBuffer = "";

function handleData(data, socket) {
  const sData = data.toString();
  const request = sData.slice(0, 4);
  switch (request) {
    case "EHLO":
    case "MAIL":
    case "RCPT":
      socket.write("250 OK\n");
      break;
    case "DATA":
      socket.write("354 Start mail input\n");
      handlingData = true;
      break;
    case "QUIT":
      socket.write("221 Bye\n");
      break;
  }
  if (handlingData) {
    fileBuffer += sData;
    if (sData.match("\r\n.\r\n")) {
      socket.write("250 OK\n");
      doNoise();
      handleFile(fileBuffer);
      fileBuffer = "";
      handlingData = false;
    }
  }
}

function doNoise() {
  spawn(config.process.program, config.process.args);
}

function handleFile(file) {
  simpleParser(file, {}, async (_err, parsed) => {
    for (const { content } of parsed.attachments) {
      await bot.sendPhoto(config.tg.chatId, content);
    }
  });
}

net
  .createServer(function (socket) {
    socket.write("220 Email 100% real no fake\n");
    socket.on("data", (data) => handleData(data, socket));
  })
  .listen(config.server.port, config.server.ip);
