# 使用 Node.js 18 作为基础镜像
FROM node:18-slim AS base

# 设置工作目录
WORKDIR /usr/src/app

# 安装项目依赖到一个临时目录中以利用缓存加速构建
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json pnpm-lock.yaml /temp/dev/
RUN cd /temp/dev && npm install -g pnpm && pnpm install --frozen-lockfile

# 复制生产依赖和源代码到最终镜像中
FROM base AS release
COPY --from=install /temp/dev/node_modules ./node_modules

# 安装 Chromium 及相关依赖
RUN apt-get update && \
    apt-get install -y \
    libasound2 \
    libgtk-3-0 \
    libnss3 \
    libdrm2 \
    libgbm1 \
    chromium && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 检查 Chromium 是否已正确安装
RUN which chromium

# 复制源代码到工作目录
COPY . .

# 设置环境变量
ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# 使用 Node.js 作为入口点，运行 index.js
ENTRYPOINT ["node", "index.js"]
