const puppeteer = require("puppeteer");
const fs = require("fs");
const { CronJob } = require("cron");
const { decodeQR, generateQRtoTerminal } = require("./utils");
require('dotenv').config();
const axios = require('axios');

const DIR_PATH = "./config";
const COOKIE_PATH = DIR_PATH + "/cookies.json";
const QR_CODE_PATH = DIR_PATH + "/qrcode.png";

let cookies = [];
let msg = `今日签到状态：{checkin}, 获得矿石：{point}`;
let errMsg = "";
let checkin = "";
let point = "-1";

const QYWX_ROBOT = process.env.QYWX_ROBOT;
const CRON = process.env.CRON;

if (!fs.existsSync(DIR_PATH)) {
    fs.mkdirSync(DIR_PATH);
}

if (!QYWX_ROBOT) {
    console.log("未配置 企业微信群机器人webhook地址, 跳过推送");
}

const pushMsg = async (msg) => {
    if (QYWX_ROBOT) {
        try {
            const response = await axios.post(
                QYWX_ROBOT,
                {
                    msgtype: "text",
                    text: {
                        content: msg,
                        mentioned_list: ['@all']
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.errcode === 0) {
                console.log("推送成功");
            } else {
                console.log("推送失败: ", response.data);
            }
        } catch (error) {
            console.error("请求失败: ", error.message);
        }
    }
};

const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const delay = (time) => {
    return new Promise(resolve => setTimeout(resolve, time));
};

const browseRandomArticles = async (page) => {
    await page.goto("https://juejin.cn/", {
        waitUntil: "networkidle0",
    });

    const articles = await page.$$('[data-entry-id]');
    const articlesToBrowse = getRandomInt(1, Math.min(7, articles.length)); // 1-7篇文章

    console.log(`准备浏览 ${articlesToBrowse} 篇文章...`);

    for (let i = 0; i < articlesToBrowse; i++) {
        const article = articles[i];
        const newPagePromise = new Promise((x) => page.once('popup', x));
        await article.click();
        const newPage = await newPagePromise;

        // 等待新页面加载并获取文章标题
        await newPage.waitForSelector('.jj-link.title');
        const title = await newPage.$eval('.jj-link.title', el => el.textContent.trim());

        await delay(getRandomInt(2000, 5000)); // 随机浏览2-5秒

        console.log(`已浏览文章 ${i + 1} - 标题: ${title}`);
        await newPage.close();
    }
};

const main = async () => {
    console.log("开始签到");
    try {
        const browser = await puppeteer.launch({
            args: [
                "--no-sandbox",
            ],
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

        await page.goto("https://juejin.cn/user/center/lottery?from=sign_in_success", {
            waitUntil: "networkidle0",
        });

        await page.waitForSelector("#turntable-item-0");
        const lotteryButton = await page.$("#turntable-item-0");

        if (lotteryButton) {
            await lotteryButton.click();
            console.log("已点击抽奖按钮");
        } else {
            console.log("未找到抽奖按钮");
        }

        // 浏览随机数量的文章
        await browseRandomArticles(page);

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

// 0：表示秒，设定为 0，即每分钟的第 0 秒执行。
// 0：表示分钟，设定为 0，即每小时的第 0 分钟执行。
// 7：表示小时，设定为 7，即每天的上午 7:00 执行。
// *：表示日期（1-31），这里设定为 *，表示每一天。
// *：表示月份（1-12），这里设定为 *，表示每个月。
// *：表示星期几（0-7，其中 0 和 7 都表示星期天），设定为 *，表示每一天。

const job = new CronJob(
    CRON || "0 0 7 * * *",
    main,
    null,
    true,
    "Asia/Shanghai"
);

job.start();
console.log("定时任务已启动");
main();
