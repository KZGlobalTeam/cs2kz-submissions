# CS2KZ Submissions

一个基于 `Nuxt 4` 的 CS2KZ 内部地图审核系统，用于管理地图提交、审核投票、Lead 最终定稿、Release 归档与导出。

该站点不直接写入官方 CS2KZ 地图 API，而是将已审核通过的内容导出为符合 `openapi.json` / `NewMap[]` 约束的 JSON，供下游 dashboard 或导入流程使用。

## 项目功能

- 登录用户可以创建 submission 并上传 course 图片
- `approver` 可以查看全部 submission 并提交审核投票
- `lead_approver` 可以做最终决定、管理 approver、管理 release
- release 可以收集已批准的 submission 并导出 JSON
- 导出结果会按 `shared/schemas/cs2kz.ts` 做契约校验

## 技术栈

- 前端与全栈框架：`Nuxt 4`、`Vue 3`、`TypeScript`
- 样式：`Tailwind CSS`
- 数据库：`PostgreSQL` + `Neon`
- ORM：`Drizzle ORM`
- 鉴权：`Steam OpenID` + 本地 session cookie
- 文件存储：`Supabase Storage`
- 校验：`zod`
- 测试：`Vitest`
- 包管理器：`pnpm`

## 核心流程

1. 登录用户创建 submission
2. approver 对 submission 投票并填写 course filter 意见
3. lead approver 做最终决定并写入最终 filters
4. 已批准的 submission 被加入 release
5. release 导出为 `NewMap[]` JSON

## 目录结构

```text
.
|-- app/                  Nuxt app 外壳与全局样式
|-- components/           按 submission/review/release/admin 分域的组件
|-- composables/          前端复用逻辑
|-- db/                   Drizzle schema 与数据库客户端
|-- middleware/           前端路由守卫
|-- pages/                页面路由
|-- server/api/           服务端接口
|-- server/queries/       读模型聚合查询
|-- server/services/      写模型与事务逻辑
|-- server/utils/         鉴权、session、存储、导出等工具
|-- shared/schemas/       前后端共享的导出契约 schema
|-- shared/types/         共享类型
|-- shared/utils/         纯工具函数
`-- tests/                unit / integration 测试
```

## 角色说明

- 普通登录用户：
  - 创建 submission
  - 上传 course 图片
  - 查看自己提交的内容
- `approver`：
  - 查看全部 submission
  - 对 `pending` submission 进行投票
- `lead_approver`：
  - 拥有 approver 全部能力
  - 执行最终批准或拒绝
  - 管理 approver 成员
  - 创建、管理并导出 release

注意：`lead_approver` 会自动通过 `approver` 权限检查。

## 环境变量

从 `.env.example` 复制一份 `.env`，并补齐以下配置：

```bash
DATABASE_URL=
NUXT_SESSION_SECRET=
NUXT_STEAM_REALM=http://localhost:3000/
NUXT_STEAM_RETURN_URL=http://localhost:3000/api/auth/callback
NUXT_STEAM_API_KEY=
NUXT_PUBLIC_SITE_URL=http://localhost:3000
NUXT_SUPABASE_URL=
NUXT_SUPABASE_SERVICE_ROLE_KEY=
NUXT_SUPABASE_STORAGE_BUCKET=course-images
```

运行前需要准备：

- 可用的 PostgreSQL 数据库
- Steam OpenID 配置
- Supabase 项目与存储桶

## 本地开发

安装依赖：

```bash
pnpm install
```

如需创建或同步数据库结构：

```bash
pnpm db:generate
pnpm db:migrate
```

启动开发服务器：

```bash
pnpm dev
```

默认地址：

```text
http://localhost:3000
```

## 常用命令

```bash
pnpm dev
pnpm build
pnpm preview
pnpm lint
pnpm test
pnpm typecheck
pnpm db:generate
pnpm db:migrate
pnpm db:push
```

## 测试与校验

提交前建议至少运行：

```bash
pnpm lint
pnpm typecheck
pnpm test
```

当前测试主要覆盖：

- workshop URL 解析
- Steam ID 转换
- 图片校验
- release export 契约形状

## 关键约束

- 只允许对 `pending` submission 投票
- 只允许将 `approved` submission 加入 release
- 导出契约以 `shared/schemas/cs2kz.ts` 为准
- course filters 固定包含 `classic` 和 `vanilla`
- 课程图片上传必须通过服务端 JPEG 与 `1920x1080` 校验

## 重要文件

- `AGENTS.md`：给 AI 会话看的项目入口说明
- `ARCHITECTURE.md`：系统架构与主流程说明
- `HANDOFF.md`：当前状态、风险点与下一步建议
- `shared/schemas/cs2kz.ts`：导出 JSON 的单一真相来源
- `server/utils/auth.ts`：服务端当前用户与角色判断
- `server/services/releases/build-export.ts`：release 导出逻辑

## 新会话建议

如果你要让新的 AI 会话快速掌握项目上下文，建议直接用这句开场：

```text
先阅读仓库根目录的 AGENTS.md、ARCHITECTURE.md、HANDOFF.md、package.json 和 .env.example，再开始分析任务；如果文档和代码不一致，以代码为准，并指出不一致之处。
```
