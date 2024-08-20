const puppeteer = require("puppeteer");
const fs = require("fs");
const { CronJob } = require("cron");
const { decodeQR, generateQRtoTerminal } = require("./utils");

const DIR_PATH = "./config";
const COOKIE_PATH = DIR_PATH + "/cookies.json";
const QR_CODE_PATH = DIR_PATH + "/qrcode.png";

let cookies = [];
let msg = `今日签到状态：{checkin}, 获得矿石：{point}`;
let errMsg = "";
let checkin = "";
let point = "-1";

const PUSH_PLUS_TOKEN = process.env.PUSH_PLUS_TOKEN;
const CRON = process.env.CRON;

if (!fs.existsSync(DIR_PATH)) {
  fs.mkdirSync(DIR_PATH);
}

if (!PUSH_PLUS_TOKEN) {
  console.log("未配置 PUSH_PLUS_TOKEN, 跳过推送");
}

const pushMsg = async (msg) => {
  if (PUSH_PLUS_TOKEN) {
    const pushPlusUrl = `https://www.pushplus.plus/send?token=${PUSH_PLUS_TOKEN}&title=掘金签到提醒&content=${msg}`;
    const data = await fetch(pushPlusUrl).then((res) => res.json());
    console.log(data.code === 200 ? "推送成功" : "推送失败");
  }
};

const main = async () => {
  console.log("开始签到");
  try {
    const browser = await puppeteer.launch({
      args: ["--no-sandbox"],
      executablePath: fs.existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : undefined,
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(1000 * 60 * 5);

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    );

    await page.setViewport({
      width: 1920,
      height: 1080,
    });

    await page.goto("https://juejin.cn/", {
      waitUntil: "networkidle0",
    });

    const login = async (retryCount = 0) => {
      if (retryCount > 3) {
        throw new Error("二维码获取失败，重试次数过多");
      }

      const loginButton = await page.$(".login-button");
      await loginButton?.click();
      await page.waitForSelector(".qrcode-img", { timeout: 5000 }).catch(async () => {
        console.log("二维码图片未找到，正在刷新页面...");
        await page.reload({ waitUntil: "networkidle0" });
        await login(retryCount + 1); // 递归调用login，增加重试次数
      });

      const qrCodeImg = await page.$(".qrcode-img");
      if (!qrCodeImg) {
        throw new Error("未找到二维码图片");
      }
      await qrCodeImg.screenshot({
        path: QR_CODE_PATH,
      });

      console.log(`请扫描 ${QR_CODE_PATH} 中的二维码进行登录`);

      const url = await decodeQR(QR_CODE_PATH);
      console.log(generateQRtoTerminal(url));

      page.on("framenavigated", async (frame) => {
        if (frame === page.mainFrame()) {
          const cookies = await page.cookies();
          fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2));
        }
      });

      await page.waitForNavigation({ waitUntil: "networkidle0" });
    };

    if (!fs.existsSync(COOKIE_PATH)) {
      await login();
    }

    cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, "utf-8"));

    await page.setCookie(...cookies);

    await page.goto("https://juejin.cn/user/center/signin?from=main_page", {
      waitUntil: "networkidle0",
    });

    await page.waitForSelector(".signin");
    const checkinButton = await page.$(".code-calender");
    await checkinButton?.click();

    await page.waitForSelector(".header-text > .figure-text");
    const figureText = await page.$(".header-text > .figure-text");
    point =
      (await page.evaluate((el) => el && el.textContent, figureText)) || point;

    page.on("response", async (response) => {
      const url = response.url();
      if (
        url.includes("get_today_status") &&
        response.request().method() === "GET"
      ) {
        const data = await response.json();
        checkin = data.data.check_in_done ? "已签到" : "未签到";
        console.log(checkin);
      }
    });

    await page.reload({
      waitUntil: "networkidle0",
    });

    if (!point) {
      point = "-1";
    }

    msg = msg.replace("{checkin}", checkin).replace("{point}", point);
    console.log(msg);
    await pushMsg(msg);

    await browser.close();
  } catch (e) {
    const error = e;
    console.error(error);
    errMsg = error.message;
    await pushMsg(`签到失败: ${errMsg}`);
    throw error;
  }
  console.log("本轮签到结束");
};

const job = new CronJob(
  CRON || "0 0 8 * * *",
  main,
  null,
  true,
  "Asia/Shanghai"
);

job.start();
console.log("定时任务已启动");
main();
