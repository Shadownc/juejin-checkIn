# juejin-checkIn
**使用前请先删除config文件夹下的内容！！！**  
**使用前请先删除config文件夹下的内容！！！**  
**使用前请先删除config文件夹下的内容！！！**
## 使用教程
1. 本地运行
  首次运行需要扫码登录 之后每天早上七点自动执行签到任务
2. 搭配`github action`
   需要本地先运行一次扫码登录后推送代码 然后就可以执行action操作了 设置了每天早上7点执行
3. 配置企业微信群机器人推送消息
   `QYWX_ROBOT` Settings action secrets新增QYWX_ROBOT 值就是你机器人的webhook地址
   [配置文档](https://developer.work.weixin.qq.com/document/path/91770)

## 免扫码获取 cookies（复制粘贴）
如果不想每次扫码登录，可以直接从已登录的浏览器复制 Cookie 生成 `config/cookies.json`：
1. Chrome 打开 https://juejin.cn 并确认已登录
2. F12 打开开发者工具 → Network(网络) 面板 → 刷新页面
3. 点任意一条 juejin.cn 的请求 → Headers → 请求标头里找到 `Cookie:`
4. 复制 `Cookie:` 冒号后面那一整串，粘贴到项目根目录的 `cookie.txt`（覆盖里面的说明文字即可）
5. 运行 `npm run cookies`（或 `node buildCookies.js`）生成 `config/cookies.json`，然后提交推送

> ⚠️ 一定要从「请求标头 Cookie」里复制，不要用控制台的 `document.cookie`。登录态 `sessionid_ss`、`sid_guard` 都是 httpOnly 的，`document.cookie` 读不到。


## 本地运行（请用PowerShell或者git bash运行）
**cmd直接运行会报错**
```bash
pnpm install  # 安装依赖
node index.js  # 运行
```
## 更新日志
### [base] - 2024-08-28
#### 添加
- 新增判断是否已经免费抽奖

#### 修复
- 修复了重复运行脚本扣除矿石抽奖

### [base] - 2024-08-29
#### 添加
- 新增判断是否已经点击签到按钮的调试信息，优化签到状态判断

#### 修复
- 修复Actions执行有时签到不执行问题

### [base] - 2024-09-01
#### 添加
- 修改点击签到按钮的判断加入重试机制

#### 修复
- 修复Actions执行有时签到不执行问题

**Docker运行报错 弃用了 想了解代码的在main-bak分支**  
  
## docker运行（已弃用 采用github action执行）
```bash
docker run -d --name juejin-checkin -e QYWX_ROBOT='你的企业微信群机器人webhook地址' -e CRON='0 0 7 * * *' lmyself/juejin-checkin:latest
```

## docker-compose运行（已弃用 采用github action执行）
```bash
docker-compose up -d
```

## 参数说明
| 字段 | 值  | 含义                           |
|:----:|:---:|:------------------------------:|
| 秒   | 0   | 每分钟的第 0 秒执行            |
| 分钟 | 0   | 每小时的第 0 分钟执行          |
| 小时 | 7   | 每天的上午 7:00 执行           |
| 日期 | *   | 每一天                         |
| 月份 | *   | 每个月                         |
| 星期 | *   | 每一天（0 和 7 都表示星期天）  |

## index_bak.js
使用`playwright`修改脚本 **未测试**