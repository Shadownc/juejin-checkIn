const puppeteer = require("puppeteer");
const fs = require("fs");
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

const browseRandomArticles = async (page, browser) => {
    await page.goto("https://juejin.cn/", {
        waitUntil: "networkidle2", // 确保页面完全加载
    });

    await new Promise(resolve => setTimeout(resolve, 3000)); // 等待额外的3秒钟，确保文章加载

    const articles = await page.$$('[data-entry-id]');
    if (articles.length === 0) {
        console.error("没有找到任何文章，可能页面加载失败或选择器不正确。");
        return;
    }

    const articlesToBrowse = getRandomInt(1, Math.min(7, articles.length));

    console.log(`准备浏览 ${articlesToBrowse} 篇文章...`);

    for (let i = 0; i < articlesToBrowse; i++) {
        const article = articles[i];
        const articleUrl = await article.$eval('a.jj-link.title', node => node.href).catch(() => null);
        const title = await article.$eval("a.jj-link.title", el => el.textContent.trim()).catch(() => "标题获取失败");
        console.log(`标题${i + 1}: ${title}`);
        if (!articleUrl) {
            console.error(`文章 ${i + 1} 没有找到URL，跳过`);
            continue;
        }

        console.log(`文章 ${i + 1} URL: ${articleUrl}`);

        let newPage = null;
        try {
            // 添加更多日志用于调试
            // console.log("尝试创建新的页面实例...");
            newPage = await browser.newPage();
            // console.log("新页面实例创建成功");

            await newPage.goto(articleUrl, { waitUntil: 'domcontentloaded' });
            // console.log(`新页面地址: ${newPage.url()}`);

            await newPage.waitForSelector('body', { timeout: 60000 }); // 确保页面加载

            await new Promise(resolve => setTimeout(resolve, getRandomInt(2000, 5000))); // 随机浏览时间2-5秒

            console.log(`已浏览文章 ${i + 1} - 标题: ${title}`);
        } catch (error) {
            console.error(`浏览文章 ${i + 1} 时发生错误: ${error.message}`);
        } finally {
            if (newPage) {
                try {
                    await newPage.close();
                    console.log(`新页面已关闭`);
                } catch (closeError) {
                    console.error(`关闭新页面时发生错误: ${closeError.message}`);
                }
            }
        }
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

            // 等待二维码图片的容器出现
            await page.waitForSelector(".qrcode-img", { timeout: 5000 }).catch(async () => {
                console.log("二维码图片未找到，正在刷新页面...");
                await page.reload({ waitUntil: "networkidle0" });
                await login(retryCount + 1); // 递归调用login，增加重试次数
            });

            // 增加延迟，确保图片完全加载
            await new Promise(resolve => setTimeout(resolve, 1000)); // 延迟1秒

            const qrCodeImg = await page.$(".qrcode-img");
            if (!qrCodeImg) {
                throw new Error("未找到二维码图片");
            }

            // 确保二维码图片元素的尺寸已经大于零（即加载完成）
            const boundingBox = await qrCodeImg.boundingBox();
            if (!boundingBox || boundingBox.width === 0 || boundingBox.height === 0) {
                console.log("二维码图片尚未加载完成，正在重试...");
                await page.reload({ waitUntil: "networkidle0" });
                await login(retryCount + 1); // 递归调用login，增加重试次数
                return;
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

        let maxRetries = 3;
        let attempt = 0;
        let freeDrawFound = false;
        let alreadySignedIn = false; //判断是否已签到

        while (attempt < maxRetries && !freeDrawFound && !alreadySignedIn) {
            attempt += 1;

            await page.goto("https://juejin.cn/user/center/signin?from=main_page", {
                waitUntil: "networkidle0",
            });

            await delay(7000);
            try {
                const signedinButton = await page.$(".code-calender .signedin");
                if (signedinButton) {
                    console.log("已签到，无需重复签到");
                    alreadySignedIn = true;
                } else {
                    await page.waitForSelector(".code-calender .signin", { visible: true,timeout: 5000 });
                    const checkinButton = await page.$(".code-calender .signin");

                    if (checkinButton) {
                        await checkinButton.click();
                        console.log("签到按钮已点击。");
                    } else {
                        console.log("签到按钮未找到，可能页面未正确加载");
                    }
                }

                await page.waitForSelector(".header-text > .figure-text");
                const figureText = await page.$(".header-text > .figure-text");
                point =
                    (await page.evaluate((el) => el && el.textContent, figureText)) || point;
            } catch (e) {
                console.log("发生错误，无法完成签到或获取积分信息")
            }

            page.on("response", async (response) => {
                const url = response.url();
                if (
                    url.includes("get_today_status") &&
                    response.request().method() === "GET"
                ) {
                    const data = await response.json();
                    console.log(`签到状态: ${JSON.stringify(data)}`)
                    if (!data.data.check_in_done) return
                    checkin = data.data.check_in_done ? "已签到" : "未签到";
                    console.log(checkin);
                }
            });

            await delay(2000);
            await page.goto("https://juejin.cn/user/center/lottery?from=sign_in_success", {
                waitUntil: "networkidle0",
            });

            await delay(2000);
            //新增是否已经免费抽奖判断
            try {
                await page.waitForSelector("#turntable-item-0 div.text-free", { visible: true, timeout: 5000 });
                const freeTextDiv = await page.$("#turntable-item-0 div.text-free");
                if (freeTextDiv) {
                    await freeTextDiv.click();
                    console.log("已点击抽奖按钮");
                    freeDrawFound = true;
                } else {
                    console.log("未找到可点击的免费抽奖按钮");
                }
            } catch (e) {
                console.log("未找到可点击的免费抽奖按钮");
            }

            if (!freeDrawFound&&!alreadySignedIn) {
                console.log(`未找到免费抽奖按钮，第${attempt}次重试签到`);
            }
        }

        if (attempt >= maxRetries && !freeDrawFound) {
            console.log("已达到最大重试次数，签到失败");
        } else {
            // 浏览随机数量的文章
            await delay(2000);
            await browseRandomArticles(page, browser);
        }

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

main();
