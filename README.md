# Lingcoo TS Fastify App Starter

一个基于原生 Fastify、TypeScript、PostgreSQL、Drizzle、React 和 pnpm workspace 的标准应用起步工程。

它提供可运行、可测试、可构建、可部署的空白应用底座，不预置身份、权限、支付或任何行业业务。

## 技术结构

```text
ts-fastify-business-starter/
├── apps/
│   ├── server/       # 原生 Fastify API、Worker、Migration
│   ├── admin/        # React + Vite 管理端空壳
│   └── web/          # React + Vite 公共 Web 空壳
├── packages/         # 应用内稳定共享契约，默认留空
├── scripts/          # 质量、边界、生成和 smoke 验证
├── docker/           # Caddy 配置
├── deploy/           # 生产部署脚本与环境模板
└── .github/          # CI、Docker、安全与部署工作流
```

后端是模块化单体。API 与 Worker 使用同一个 `apps/server` 包和领域代码，但作为独立进程运行。workspace 不代表微服务。

## 快速开始

要求 Node.js 24、Corepack、pnpm 11 和 Docker。

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm dev
```

默认地址：

- Web：<http://localhost:5174>
- Admin：<http://localhost:5173/admin/>
- API liveness：<http://localhost:8090/health/live>
- API readiness：<http://localhost:8090/health/ready>
- OpenAPI UI：<http://localhost:8090/api/docs>

Worker 按需单独启动：

```bash
pnpm dev:worker
```

## 创建新项目

CLI 发布后可使用：

```bash
npx @lingcoo-tech/create-ts-fastify-app-starter@latest my-app
```

仓库内维护者可以使用本地模板验证：

```bash
node create-ts-fastify-app-starter/cli.mjs /tmp/my-app \
  --template-path . \
  --skip-install \
  --no-git
```

## 开发业务模块

```bash
pnpm generate:module catalog
```

生成的模块按 `api / application / domain / infrastructure` 分层。完成实现后，在 `apps/server/src/modules/index.ts` 的 composition root 显式注册。

模块规则：

- Route 只处理 HTTP、校验和响应映射；
- Application Service 编排用例和事务；
- Domain 不依赖 Fastify 和 Drizzle；
- Repository、Schema 和 Provider Adapter 属于 Infrastructure；
- 跨模块只能导入对方的 `public.ts`；
- 不使用全局数据库单例或隐式 Service Locator。

## 工程检查

```bash
pnpm check
pnpm smoke:module-generator
pnpm smoke:generated
pnpm smoke:docker
```

`pnpm check` 包括工具链、starter 版本、模块边界、格式、Lint、类型、测试和 production build。

详细说明：

- [架构](docs/architecture.md)
- [开发](docs/development.md)
- [部署](docs/deployment.md)
- [质量标准](docs/quality-bar.md)

## 边界

基础 Starter 默认不包含：

- Identity、RBAC、Settings、Audit；
- Jobs、Outbox、Mail、Notifications；
- Storage、Payments；
- Redis、消息队列和对象存储服务；
- 教育、零售或其他行业领域模型。

这些能力应由后续 Business preset 或真实项目按需加入。

## 许可证

Apache License 2.0。
