// 把 cookie.txt 里粘贴的浏览器 Cookie 字符串转换成项目需要的 config/cookies.json。
// 用法：编辑 cookie.txt 粘贴 Cookie 内容，然后运行 `node buildCookies.js`（或 `npm run cookies`）。
const fs = require("fs");
const path = require("path");

const INPUT_PATH = "./cookie.txt";
const DIR_PATH = "./config";
const COOKIE_PATH = DIR_PATH + "/cookies.json";

// 一年后过期（秒）
const ONE_YEAR_LATER = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;

if (!fs.existsSync(INPUT_PATH)) {
    console.error(`未找到 ${INPUT_PATH}，请先创建并粘贴浏览器里的 Cookie 字符串。`);
    process.exit(1);
}

// 读取并去掉注释行(#开头)与空行，拼成一整串
const raw = fs
    .readFileSync(INPUT_PATH, "utf-8")
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .join("; ")
    .replace(/^\s*cookie\s*:\s*/i, "") // 去掉可能带上的 "Cookie:" 前缀
    .trim();

if (!raw) {
    console.error(`${INPUT_PATH} 里没有有效的 Cookie 内容，请粘贴后重试。`);
    process.exit(1);
}

const cookies = raw
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
        const idx = pair.indexOf("=");
        if (idx === -1) return null;
        const name = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (!name) return null;
        return {
            name,
            value,
            domain: ".juejin.cn",
            path: "/",
            expires: ONE_YEAR_LATER,
            httpOnly: false,
            secure: true,
            session: false,
            sameSite: "None",
            priority: "Medium",
            sameParty: false,
            sourceScheme: "Secure",
        };
    })
    .filter(Boolean);

if (cookies.length === 0) {
    console.error("未解析出任何 cookie，请检查 cookie.txt 内容格式（应形如 name=value; name2=value2）。");
    process.exit(1);
}

if (!fs.existsSync(DIR_PATH)) fs.mkdirSync(DIR_PATH);
fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2));

const hasSession = cookies.some((c) => c.name === "sessionid_ss" || c.name === "sessionid");
console.log(`已写入 ${cookies.length} 条 cookie 到 ${COOKIE_PATH}`);
if (!hasSession) {
    console.warn("提示：未发现 sessionid/sessionid_ss，登录态可能不完整（记得从「请求标头」里复制，而不是 document.cookie）。");
}
console.log("完成。现在可以提交 config/cookies.json 并推送。");
