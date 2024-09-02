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
