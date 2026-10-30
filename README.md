# 鱼标点

钓点发现与渔获记录工具 —— 支持微信小程序、抖音小程序和 H5。

## 当前功能

- 浏览、搜索和收藏钓点；记录私人或公开钓点，支持照片、鱼种、标签与验点反馈。
- 记录个人渔获：鱼种、日期、照片、长度、重量、钓法、饵和关联钓点；查看累计渔获、鱼种数和最大重量。
- 将钓点加入个人路线并逐点导航。
- 约人行程已从产品页面和 API 下线；历史数据库表保留，避免删除已有数据。

渔获日志使用 `catches` 表。服务启动时会自动创建该表；也可手动执行 `server/prisma/add_catches.sql`。拍照识鱼和排行榜尚未接入。

## 项目结构

```
diaodian/
├── server/        # 后端 API (Koa2 + TypeScript + Prisma + MySQL)
├── client/        # 小程序前端 (uni-app + Vue 3)
├── admin/         # 后台管理 (Vue 3 + Element Plus)
└── docker-compose.yml
```

## 快速开始

### 1. 后端

```bash
cd server
npm install
cp .env.example .env  # 修改数据库连接
npx prisma migrate dev --name init
npm run dev
```

小程序登录需要在后端 `.env` 配置平台密钥，前端只传登录 `code`，由后端换取 `openid`：

```env
WECHAT_APPID=
WECHAT_APP_SECRET=
DOUYIN_APPID=
DOUYIN_APP_SECRET=
```

### 2. 小程序

使用 HBuilderX 打开 `client/` 目录，或：

```bash
cd client
npm install
npm run dev:mp-weixin   # 编译到微信小程序
npm run dev:mp-toutiao  # 编译到抖音小程序
```

用对应 IDE 打开 `dist/dev/mp-weixin` 预览。

地图功能需要在 `client/.env` 中填写 `VITE_AMAP_JS_KEY` 和 `VITE_AMAP_WEB_KEY`；小程序 AppID 与地图 SDK Key 请在本地 `client/src/manifest.json` 中配置，不要提交真实密钥。

微信/抖音小程序真机不支持请求相对路径 `/api`。在 `client/.env` 配置后端 HTTPS 域名：

```env
VITE_API_BASE_URL=https://你的域名
```

同时在微信公众平台/抖音开放平台配置 request 合法域名，例如 `https://你的域名`。

### 3. 后台管理

```bash
cd admin
npm install
npm run dev
# 访问 http://localhost:3777
```

### 4. Docker 部署

```bash
docker-compose up -d
```

## 账号配置

部署后请自行创建账号，并通过数据库将需要管理权限的账号角色设为 `admin`。不要在代码仓库中保存账号密码。

## API 文档

见 `server/src/controllers/` 中各文件的路由定义。
