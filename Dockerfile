# 使用 Node.js 18 作为基础镜像
FROM node:18-slim AS base

# 设置工作目录
WORKDIR /app

# 安装 Chromium 及相关依赖
RUN apt-get update && \
    apt-get install -y \
    chromium \
    libasound2 \
    libgtk-3-0 \
    libnss3 \
    libdrm2 \
    libgbm1 \
    dumb-init && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 安装 pnpm
RUN npm install -g pnpm

# 安装依赖到一个临时目录中以利用缓存加速构建
FROM base AS install
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 复制生产依赖和源代码到最终镜像中
FROM base AS release
COPY --from=install /app/node_modules ./node_modules
COPY . .

# 设置环境变量
ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# 使用 dumb-init 作为 init 系统，防止进程僵尸
ENTRYPOINT ["dumb-init", "--"]

# 启动应用
CMD ["node", "index.js"]  # 根据你的入口文件名称调整
