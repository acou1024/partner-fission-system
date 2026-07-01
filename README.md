# 私域合伙人裂变与分销核算系统

## 一、项目背景与意义

在私域流量运营场景中，企业通过合伙人模式进行客户裂变与分销，但传统的线下管理方式存在**佣金核算复杂、客户归属不清、数据不透明**等痛点。本项目旨在开发一套私域合伙人裂变与分销核算系统，帮助企业实现合伙人管理、客户归属追踪、佣金自动计算与结算的数字化管理，提升运营效率和数据透明度。

## 二、团队信息

**组名**：GZT Studio

| 学号 | 姓名 | 角色 | 职责描述 |
|------|------|------|----------|
| 2340129436 | 吴自有 | 项目经理 (PM) | 负责需求把控、进度追踪、组织周会、最终交付质量 |
| 2340129444 | 叶俊贤 | 全栈开发 (FE/BE) | 负责前后端架构设计、数据库设计、API开发、UI实现与联调 |
| 2340129441 | 董仲轩 | 质量保证 (QA) | 负责测试用例编写、Bug管理、代码审查、交付文档整理 |

## 三、核心功能模块

所有规划功能均已实现并通过测试。

### 核心功能

| 模块 | 功能说明 | 后端实现文件 |
|------|----------|-------------|
| 用户认证 | 管理后台账号密码登录；微信 OAuth 合伙人静默登录，开发环境支持跳过微信验证 | `authController.js` |
| 合伙人管理 | 合伙人的新增、编辑、删除、查询；支持两级上下级关系；分润规则支持固定比例和阶梯比例两种模式；可生成二维码邀请链接；支持解绑微信 | `partnerController.js` |
| 客户管理 | 客户信息的增删改查；客户自动归属录入其信息的合伙人；支持合伙人报备新客户并由管理员审核 | `customerController.js` |
| 邀请码系统 | 每位合伙人持有唯一邀请码/链接；客户扫码后自动绑定归属关系；支持独立落地页域名 | `inviteController.js` |
| 流水录入 | 交易流水的增删改查；支持 Excel 文件批量导入（按客户昵称自动匹配）；导入前可预览匹配结果；支持将历史流水标记为已归档 | `transactionController.js` |
| 佣金计算 | 录入流水时自动计算直推佣金和团队佣金，实时更新合伙人余额；固定比例和阶梯比例均自动适配 | `transactionController.js` |
| 结算管理 | 记录对合伙人的佣金结算；结算后自动扣减余额；支持月度结算汇总统计 | `settlementController.js` |
| 合伙人工作台 | H5 移动端首页，展示本月收益、上月流水/分润、累计流水、今日流水、今日新增客户数；下方为客户列表和团队列表 | `mobileController.js` |

### 扩展功能

| 模块 | 功能说明 | 后端实现文件 |
|------|----------|-------------|
| 素材中心 | 管理员上传营销图片（单次最多 20 张），合伙人在 H5 端查看和下载 | `knowledgeController.js` |
| 话术库 | 按分类管理销售话术，支持批量导入；合伙人在 H5 端按分类浏览 | `knowledgeController.js` |
| 客户报备 | 合伙人在 H5 端提交新客户报备申请，管理员在后台审核通过或驳回 | `customerController.js` |
| 域名防封 | 维护多个备用域名，入口域名与落地页域名分开管理，可一键切换 | `systemController.js` |
| 数据大盘 | 管理后台可视化图表，展示合伙人数、客户数、流水与佣金趋势；合伙人流水排行榜 | `dashboardController.js` |
| 手工记账本 | 合伙人在 H5 端记录私人账目，与系统流水互相独立，支持增删改查 | `ledgerController.js` |
| 问答反驳库 | 维护常见客户疑问与应对话术，合伙人在 H5 端查阅 | `qaController.js` |
| 风控字典 | 维护敏感词与风控红线词库，合伙人在 H5 端查阅，避免违规表述 | `qaController.js` |
| 方案赔率管理 | 配置和复制投注方案赔率，支持按方案汇总查看客户盈利数据 | `profitController.js` |
| 收益推演工具 | H5 端内置倍投精算计算器，合伙人可按本金和赔率推演收益 | `mobileController.js` |
| 员工权限管理 | 系统分为超级管理员（admin）和普通员工（staff）两个级别；所有操作自动写入操作日志 | `systemController.js` |
| 客户落地页 | 客户扫码后进入独立落地页完成注册，并可查看本人历史流水记录 | `inviteController.js` |

## 四、技术选型

| 层级 | 技术方案 | 版本 |
|------|----------|------|
| 后端运行时 | Node.js + Express | Express ^4.21 |
| ORM | Prisma | ^5.20 |
| 数据库 | MySQL | 8.x |
| 缓存 | Redis (ioredis) | ^5.4 |
| 管理后台 | Vue3 + Element Plus + ECharts | Vue ^3.5 / EP ^2.8 |
| 合伙人H5 | Vue3 + Vant 4 | Vue ^3.5 / Vant ^4.9 |
| 构建工具 | Vite | ^5.4 |
| 认证 | JWT + 微信OAuth2.0 | jsonwebtoken ^9.0 |
| 文件处理 | Multer + Sharp + xlsx | — |
| 日志 | Winston | ^3.14 |

## 五、项目结构

```
system/
├── server/                  # 后端（Node.js + Express）
│   ├── src/
│   │   ├── app.js           # 主入口，中间件与路由挂载
│   │   ├── config/          # 环境变量读取与默认配置
│   │   ├── controllers/     # 13个业务控制器
│   │   ├── routes/          # 4条路由前缀
│   │   ├── middleware/       # auth、operationLog中间件
│   │   ├── utils/           # response、logger等工具
│   │   └── scheduler.js     # 定时任务（素材清理）
│   ├── prisma/
│   │   ├── schema.prisma    # 数据库模型定义
│   │   └── seed.js          # 初始数据种子
│   ├── tests/               # 自动化测试脚本
│   ├── proxy.js             # 开发统一代理（port 8080）
│   └── .env                 # 环境变量（本地不提交）
├── admin/                   # 管理后台（Vue3 + Element Plus）
│   └── src/views/           # 19个页面
├── mobile/                  # 合伙人H5（Vue3 + Vant 4）
│   └── src/views/           # 18个页面
└── README.md
```

## 六、API 路由前缀

| 前缀 | 说明 | 鉴权 |
|------|------|------|
| `/api/auth` | 登录、微信OAuth、绑定 | 无 |
| `/api/admin` | 管理后台全部接口 | JWT (admin/staff) |
| `/api/mobile` | 合伙人H5全部接口（无缓存） | JWT (partner) |
| `/api/invite` | 邀请码/客户端落地页 | 部分公开 |

## 七、本地开发启动

```bash
# 1. 后端
cd server
cp .env.example .env   # 填写 DATABASE_URL、JWT_SECRET 等
npm install
npx prisma db push
node prisma/seed.js    # 初始化 admin 账号
npm run dev            # 启动在 :3000

# 2. 管理后台
cd admin && npm install && npm run dev   # :5173

# 3. 合伙人H5
cd mobile && npm install && npm run dev  # :5174

# 4. 统一代理（可选，开发时单入口）
node server/proxy.js   # :8080 → 转发到 3000/5173/5174
```

## 八、核心数据模型

```
SysUser（管理员/员工）
  └─ Partner（两级合伙人，支持 fixed/tiered 分润）
       ├─ Customer（客户，归属某合伙人）
       │    └─ Transaction（流水，自动生成佣金）
       │         └─ Commission（佣金记录）
       ├─ Settlement（结算记录）
       └─ CustomerReport（报备记录）

其他模型：Material / ScriptCategory / ScriptContent /
          DomainConfig / SystemConfig / QaItem / RiskWord /
          OperationLog / BettingScheme / Ledger
```

## 九、项目仓库

- GitHub：https://github.com/acou1024/partner-fission-system
