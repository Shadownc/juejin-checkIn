# juejin-checkIn

## 使用教程
首次运行需要扫码登录 之后每天早上七点自动执行签到任务

## 本地运行（请用PowerShell或者git bash运行）
**cmd直接运行会报错**
```bash
pnpm install  # 安装依赖
node index.js  # 运行
```

## docker运行
```bash
docker run -d --name juejin-checkin -e QYWX_ROBOT='你的企业微信群机器人webhook地址' -e CRON='0 0 7 * * *' lmyself/juejin-checkin:latest
```

## docker-compose运行
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
