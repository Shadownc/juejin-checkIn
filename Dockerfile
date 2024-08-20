# 使用 Node.js 18 作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装 Chromium 及相关依赖
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    libxshmfence

# 安装 pnpm
RUN npm install -g pnpm

# 复制 pnpm 配置文件和锁文件
COPY pnpm-lock.yaml ./
COPY package.json ./

# 安装项目依赖
RUN pnpm install --frozen-lockfile

# 复制项目文件到容器中
COPY . .

# 设置环境变量
ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 启动应用
CMD ["node", "index.js"]  # 根据你的入口文件名称调整
