# TS Fastify Business Starter 通用模块计划与实施方案

> 制定日期：2026-08-29
>
> 目标仓库：`/Users/admin/Projects/ts-fastify-business-starter`
>
> 基础仓库：`/Users/admin/Projects/ts-fastify-app-starter`
>
> 实施约束：原生 Fastify、模块化单体、单实例单业务主体、Admin UI 前置、逐模块闭环交付

## 当前实施状态

- 阶段 0：已于 2026-08-30 完成；
- 阶段 1 Identity：已于 2026-08-30 完成；
- 当前质量门禁：Format、Lint、Typecheck、Unit、Build、Admin Static Smoke、Playwright、Docker Smoke 均通过；
- 下一阶段：Access Control；
- Access Control 开始前不并行创建 Audit 或其他模块骨架。

## 1. 最终决策

本轮建设目标是一个轻量、可运行、可生成的 Fastify Business Starter，用于沉淀多个业务项目重复使用的后台通用能力。

明确采用以下方案：

1. 保持原生 Fastify 模块化单体，不引入 NestJS、微服务或内部依赖注入框架；
2. 保持 `apps/server`、`apps/admin`、`apps/web` 三个独立应用入口；
3. 当前只建设 `apps/admin`，`apps/web` 保留空白入口，不实施公共站点业务与 UI 体系；
4. Admin 使用 React、Vite、Ant Design 6；
5. Ant Design 相关代码只属于 `apps/admin`，不得进入 `apps/web` 的依赖图；
6. 先一次性完成工程基础和 Admin Shell，然后严格逐个模块实施；
7. 每个模块一次完成 Schema、Migration、Service、API、Contract、API Client、Admin UI 和测试；
8. 当前不建设 SaaS、多租户、租户成员关系、租户级计费和租户级数据隔离；
9. 当前每次部署服务一个独立业务主体，行业项目自行拥有机构、店铺、课程、商品等领域模型；
10. 不把 Edu、Retail 或 Core Stack 的行业模型复制进通用 Starter。

## 2. 本轮范围

### 2.1 默认通用模块

按照依赖顺序逐个实施：

1. Identity；
2. Access Control；
3. Audit；
4. Settings；
5. Idempotency；
6. Jobs；
7. Transactional Outbox；
8. Mail；
9. Notifications；
10. Storage 与 Asset Management；
11. Application Branding；
12. Payments。

### 2.2 可选模块

- Webhook Inbox：Payments 完成后再决定是否默认启用；
- 轻量 CMS：只保留候选，不进入本轮；
- AI Gateway：等待第二个真实采用项目；
- Feature Entitlement：等待独立于 Edu 课时权益的稳定模型。

### 2.3 明确排除

本轮不实施：

- SaaS Control Plane；
- Tenant、TenantMembership、TenantDomain；
- 任意业务表的 `tenant_id`；
- 租户切换、租户套餐、租户配额；
- 教培机构、合作机构、校区、课程、课时包、学员、班级、课次、点名；
- 店铺、商品、库存、订单、履约、售后；
- Core Stack 的应用市场、License、部署和结算；
- 微信小程序、公众号、支付宝等具体业务登录方式；
- `apps/web` 的营销站、商城、用户中心和公共内容页面。

如果未来确认需要 SaaS，应重新立项和编写 ADR，不在本轮预埋半成品多租户结构。

## 3. 部署与业务主体模型

当前模型是单实例、单数据库、单业务主体：

```text
一个部署
├── 一个 Fastify API
├── 一个 Worker
├── 一个 PostgreSQL 数据库
├── 一个 Admin 应用
└── 一个预留 Web 应用
```

Business Starter 不定义“机构”或“店铺”表。

- Edu 可在自己的领域模块中定义机构、合作机构和校区；
- Retail 可定义店铺、仓库和商户；
- Core Stack 可定义平台站点和运营主体；
- 通用 Branding 只描述当前部署的应用名称、Logo、主题和公开基础信息。

## 4. 前端边界

### 4.1 应用入口

```text
apps/
├── server/   # Fastify API 与 Worker
├── admin/    # 通用管理后台，本轮实施
└── web/      # 通用公共端占位，本轮不实施
```

具体项目可以在生成后按业务重命名或增加入口，例如 Retail 可以增加 `shop-web`，Edu 可以增加 `portal-web`。这些名称和技术选型不进入通用 Starter。

### 4.2 Admin 技术栈

| 能力             | 选型                     |
| ---------------- | ------------------------ |
| 构建             | Vite                     |
| UI               | Ant Design 6             |
| 图标             | `@ant-design/icons`      |
| 路由             | React Router             |
| 服务端状态       | TanStack Query           |
| Runtime Contract | Zod                      |
| 单元交互测试     | Vitest + Testing Library |
| 浏览器验收       | Playwright               |

不默认引入：

- Tailwind CSS；
- shadcn/ui 源码；
- Radix primitive 集合；
- TanStack Table；
- react-hook-form；
- 第二套后台组件库。

### 4.3 Web 技术栈

本轮不决定 `apps/web` 使用 React、Astro、Ant Design、Tailwind 或其他 UI 方案。Edu、Stack
等具体项目可以为 Web 独立选择 Ant Design，Retail 等项目也可以选择完全不同的公共端技术栈。

约束只有三条：

1. `apps/web` 是独立构建入口；
2. `apps/web` 不自动依赖 Admin 组件和 Admin CSS；如果选择 Ant Design，应由 Web 自己声明依赖；
3. 将来只共享无 UI 框架依赖的 Contracts 和 API Client。

### 4.4 UI 代码位置

Admin UI 暂时直接放在 `apps/admin/src`：

```text
apps/admin/src/
├── app/
│   ├── router.tsx
│   ├── providers.tsx
│   ├── navigation.ts
│   └── query-client.ts
├── layouts/
│   └── AdminShell.tsx
├── components/
│   ├── PageContainer.tsx
│   ├── ResourceTable.tsx
│   ├── ResourceDrawer.tsx
│   ├── AsyncState.tsx
│   ├── StatusTag.tsx
│   └── ApiErrorAlert.tsx
├── features/
├── routes/
└── styles/
```

不创建 `packages/ui` 或 `packages/admin-ui`。当前只有一个 Admin 消费者，提前抽包只会增加版本和边界维护成本。

如果以后出现第二个真正复用相同 Admin UI 的应用，再基于实际重复代码提取。

## 5. Workspace 目标结构

```text
ts-fastify-business-starter/
├── apps/
│   ├── server/
│   │   ├── src/
│   │   │   ├── composition/
│   │   │   ├── config/
│   │   │   ├── database/
│   │   │   ├── entrypoints/
│   │   │   ├── http/
│   │   │   └── modules/
│   │   ├── drizzle/
│   │   └── test/
│   ├── admin/
│   └── web/
├── packages/
│   ├── contracts/
│   └── api-client/
├── create-ts-fastify-business-starter/
├── docs/
├── scripts/
└── deploy/
```

首轮只增加两个共享包：

- `packages/contracts`：Server 与浏览器应用共享的 Zod 协议；
- `packages/api-client`：无 React、无 Ant Design 的 Fetch Client。

不增加 `shared`、`common`、`utils`、`core` 等职责不清的包。

## 6. 服务端模块规范

每个模块使用一致结构：

```text
apps/server/src/modules/<module>/
├── api/
│   ├── routes.ts
│   └── schemas.ts
├── application/
│   ├── commands/
│   ├── queries/
│   └── service.ts
├── domain/
│   ├── model.ts
│   ├── policies.ts
│   └── events.ts
├── infrastructure/
│   ├── schema.ts
│   ├── repository.ts
│   └── adapters/
├── workers/
├── plugin.ts
├── public.ts
└── test/
```

不是每个模块都必须机械创建所有目录。没有领域规则、Worker 或 Adapter 时应省略空目录。

### 6.1 模块边界

- 每张业务表只有一个所有者模块；
- 跨模块只能通过 `public.ts` 暴露的 Port 或 Service；
- 禁止直接导入其他模块 Repository；
- 禁止跨模块直接更新其他模块的表；
- HTTP Route 不编排多步事务；
- Fastify Plugin 只负责 HTTP 注册和作用域；
- 不使用 Decorator、自动扫描或隐式 DI 容器；
- 依赖必须通过 Composition Root 显式传入。

### 6.2 事务边界

Application Service 负责事务：

```text
HTTP Route
  -> Application Service
      -> Database Transaction
          -> Repository
          -> Audit Port
          -> Outbox Port
```

Repository 不自行创建事务，跨模块写操作必须通过同事务 Writer Port。

### 6.3 数据库约束

- ID 默认 UUID；
- 时间统一 `timestamptz`；
- 金额统一整数 minor unit + currency；
- 唯一性和状态不变量优先使用数据库约束；
- 外部幂等键必须有唯一索引；
- 审计、Outbox、支付回调等事实记录尽量不可变；
- 禁止用 JSONB 代替稳定关系模型；
- Migration 只能前进，不在生产中自动回滚。

## 7. Contracts 与 API Client

### 7.1 Contracts

```text
packages/contracts/src/
├── common/
│   ├── errors.ts
│   ├── pagination.ts
│   ├── sorting.ts
│   ├── ids.ts
│   └── time.ts
├── identity/
├── access/
├── audit/
├── settings/
├── idempotency/
├── jobs/
├── mail/
├── notifications/
├── storage/
├── branding/
└── payments/
```

约束：

- 使用 Zod 定义公开请求和响应；
- 不依赖 Fastify、Drizzle、React 或 Ant Design；
- 不导出数据库 Row Type；
- 时间通过 ISO 8601 字符串传输；
- 分页统一 `items/page/pageSize/total`；
- 错误统一 `code/message/details/requestId`；
- 事件 Contract 必须带版本号。

### 7.2 API Client

```text
packages/api-client/src/
├── core/
│   ├── client.ts
│   ├── errors.ts
│   └── session.ts
├── modules/
└── index.ts
```

约束：

- 仅使用原生 Fetch；
- 自动携带 Cookie 和 CSRF；
- 响应通过 Contract 校验；
- 支持 AbortSignal；
- 不依赖 React Query；
- 不显示 Toast；
- 不跳转路由；
- 不引入 Ant Design；
- React Query Hooks 留在 `apps/admin` 对应 feature 内。

## 8. Admin 基础规范

### 8.1 Admin Shell

一次性完成：

- Sidebar；
- Topbar；
- Breadcrumb；
- 账户菜单；
- 权限过滤导航；
- 移动端 Drawer；
- 明暗主题；
- 中文 Locale；
- 401、403、404、500 页面；
- Command Palette；
- 路由级懒加载；
- API 错误和全局异常反馈。

模块通过导航注册表贡献菜单项，禁止持续扩张单个中央菜单文件。

### 8.2 资源页标准

```text
Page Header
  -> Search / Filter / Actions
  -> Resource Table
  -> Pagination
  -> Detail Drawer
  -> Create/Edit Form
  -> Audit Timeline（适用时）
```

资源页统一处理：

- 服务端分页；
- 服务端排序；
- URL Query 同步；
- Loading、Empty、Error；
- 字段错误映射；
- 删除和危险操作确认；
- 权限控制；
- 移动端基本可用性。

### 8.3 UI 维护边界

直接使用 Ant Design 的 Button、Input、Select、Form、Table、Drawer、Modal、Upload、Pagination 等组件。

只封装应用级组合，不重新实现基础组件，不重新导出整个 Ant Design。

## 9. 默认模块设计

### 9.1 Identity

职责：

- 账号；
- 密码凭据；
- Cookie Session；
- 登录和退出；
- 邮箱验证；
- 忘记和重置密码；
- 修改密码；
- Session 撤销；
- 初始账号 Bootstrap（下一阶段由 Access Control 幂等分配 Owner 角色）。

不负责：

- 教师、学生、买家、员工等行业档案；
- 微信、支付宝等具体业务身份；
- 组织和机构关系。

Admin 页面：

- Login；
- Account Security；
- Active Sessions。

账号目录、账号详情、启停账号和角色分配需要明确的管理权限，统一放在下一阶段 Access
Control 一次性交付。Identity 只提供公开的账号查询/管理 Port，不注册弱授权的临时管理 API。

邮箱验证与密码找回由 Identity 拥有令牌生命周期，并通过 `IdentityActionDeliveryPort`
投递。阶段 1 提供仅限开发/测试的令牌暴露机制；阶段 8 Mail 通过 Composition Root 接入正式投递，
不修改 Identity 的 Schema、Service 或 API。

关键验收：

- Cookie、CSRF、密码哈希和 Session 安全测试；
- Bootstrap 幂等；
- 登录限速；
- 改密后旧 Session 按策略失效；
- 不返回密码哈希和 Token 明文。

### 9.2 Access Control

职责：

- Permission Registry；
- Role；
- Role Permission；
- Account Role Assignment；
- Route Guard；
- UI Permission Gate；
- 默认拒绝策略。

当前只实现部署内 RBAC，不实现租户范围和行业 Data Scope。

Admin 页面：

- Roles；
- Role Detail；
- Permission Matrix；
- User Role Assignment。

关键验收：

- 未声明权限默认拒绝；
- 后端权限是最终裁决，前端隐藏按钮不是安全边界；
- Owner 保底权限不可被误删；
- 权限代码重命名有 Migration 策略。

### 9.3 Audit

职责：

- 追加式审计事件；
- Actor、Action、Resource、Request ID、IP、User Agent；
- 变更摘要；
- 安全事件和管理操作查询；
- 模块级 Audit Writer Port。

Admin 页面：

- Audit Logs；
- Audit Detail；
- 按账号、动作、资源和时间筛选。

关键验收：

- 普通应用路径不能更新或删除审计记录；
- Secret、密码、Token 和支付敏感字段不得进入差异数据；
- 审计写入与关键业务修改共享事务。

### 9.4 Settings

职责：

- Typed Settings Registry；
- 公开、内部、Secret 三类配置；
- 环境变量、数据库配置和默认值优先级；
- Secret 加密；
- 配置校验；
- Provider Connection Test Port。

Admin 页面：

- Settings 分组页面；
- Secret 只显示 configured/source/updatedAt；
- 配置测试结果。

关键验收：

- Secret 永不回读明文；
- 非法配置不能写入；
- 设置修改与 Audit 同事务；
- 环境变量覆盖项在 UI 中只读。

### 9.5 Idempotency

职责：

- Idempotency Key；
- Request Hash；
- 执行状态；
- 成功响应重放；
- 冲突和过期策略；
- 并发占用控制。

Admin 页面：

- Idempotency Records 只读诊断页；
- 按 key、状态、操作和时间查询。

关键验收：

- 相同 key 与相同请求不重复执行；
- 相同 key 与不同请求返回冲突；
- 并发请求只有一个执行者；
- 失败和超时状态可恢复。

### 9.6 Jobs

职责：

- PostgreSQL Job Queue；
- Claim、Heartbeat、Retry；
- Attempts；
- Stale Recovery；
- Dead Letter；
- Worker Handler Registry；
- 定时任务注册。

Admin 页面：

- Jobs；
- Job Detail；
- Attempts；
- Dead Letters；
- 手动重试和取消。

关键验收：

- 两个 Worker 不重复领取；
- Worker 崩溃后可恢复；
- 重试遵循退避策略；
- Handler 需要业务幂等；
- 手动操作有权限和审计。

### 9.7 Transactional Outbox

职责：

- 业务事务内写入事件；
- Publisher Worker；
- Retry 和 Dead Letter；
- Event Version；
- Consumer Deduplication Contract。

Admin 页面：

- Outbox Events；
- Failed Events；
- Event Detail；
- 重放操作。

关键验收：

- 业务写入和 Outbox 写入原子提交；
- 发布失败不丢事件；
- 重放不产生重复业务副作用；
- 事件只包含稳定事实，不传数据库 Row。

### 9.8 Mail

职责：

- SMTP Provider；
- Template；
- Mail Delivery；
- Retry；
- 测试邮件；
- 开发环境捕获适配器。

Admin 页面：

- Mail Settings；
- Templates；
- Deliveries；
- Delivery Detail；
- Test Mail。

关键验收：

- SMTP Secret 不进入浏览器；
- 失败邮件进入 Jobs 重试；
- 模板变量校验；
- 同一业务通知不会重复发送。

### 9.9 Notifications

职责：

- 站内通知；
- Announcement；
- 用户通知状态；
- 未读计数；
- 邮件渠道编排；
- 通知偏好扩展点。

Admin 页面：

- Notifications；
- Announcements；
- 发布和撤回；
- 当前账号通知中心。

关键验收：

- 未读计数一致；
- 重试不生成重复通知；
- Announcement 受众和状态转换有约束；
- 邮件失败不影响站内通知事实。

### 9.10 Storage 与 Asset Management

职责：

- Local Adapter；
- S3-compatible Adapter；
- 对象元数据；
- 上传策略；
- MIME、大小和扩展名校验；
- 公开和私有访问；
- Asset Reference；
- 安全删除策略。

Admin 页面：

- Storage Settings；
- Objects；
- Asset Library；
- Asset Picker；
- 上传、预览、替换和删除。

关键验收：

- Provider Secret 不进入浏览器；
- Local 与 S3-compatible 通过同一 Contract Test；
- 非法文件被拒绝；
- 删除前检查引用；
- 私有资源不能通过猜测 URL 访问。

### 9.11 Application Branding

职责：

- 应用名称；
- Logo、Favicon；
- 主题色；
- 登录页基础文案；
- 公开 Branding Endpoint；
- Admin 主题映射。

Branding 不是机构、租户、店铺或 CMS。

Admin 页面：

- Branding Settings；
- Logo 和 Favicon 选择；
- 主题实时预览。

关键验收：

- Logo 使用 Storage Asset Reference；
- 主题色经过格式校验；
- 不允许写入任意 CSS 和 HTML；
- Branding 更新后 Admin 刷新可见。

### 9.12 Payments

职责：

- Payment Intent；
- Provider Transaction；
- Callback Fact；
- Refund；
- Close、Query、Reconcile；
- Provider Adapter；
- Mock Provider；
- Alipay、WeChat Adapter 候选。

Payments 不拥有 Edu 合同、Retail 订单或 Core Stack 商品订单。

Admin 页面：

- Payment Intents；
- Provider Transactions；
- Callbacks；
- Refunds；
- Reconciliation；
- Provider Settings。

关键验收：

- 验签、金额、商户、App ID 和 Provider ID 校验；
- 重复 Callback 幂等；
- 超额退款和重复退款被拒绝；
- Provider 超时保持可对账状态；
- 业务订单通过 Port 接收支付事实；
- 支付模块不直接修改行业订单表。

## 10. 逐模块闭环交付规则

不采用“先完成全部数据库，再完成全部 API，再补全部 UI”的横向实施方式。

每次只允许一个模块处于实施状态：

```text
模块边界确认
  -> Schema 与 Migration
  -> Domain/Application/Repository
  -> Fastify API
  -> Contracts
  -> API Client
  -> Admin 页面
  -> Permission 与 Audit 接入
  -> Unit/Integration/Playwright
  -> /admin 人工验收
  -> 文档与提交
  -> 下一个模块
```

### 10.1 开始条件

模块开始前必须写清：

- 模块职责和非职责；
- Schema 所有权；
- 公开 Port；
- API；
- 权限；
- 事务边界；
- Admin 页面；
- 验收测试；
- 对已有模块的接入点。

### 10.2 完成条件

当前模块必须同时满足：

- Migration 可在空库和已有库执行；
- API Contract 稳定；
- Admin 页面可实际操作；
- 权限默认拒绝；
- 错误、空状态和加载状态完整；
- 测试通过；
- `pnpm check` 通过；
- `/admin` 人工验收通过；
- 文档更新完成。

未完成前禁止开始下一个模块。

### 10.3 已完成模块变更规则

后续模块可以通过预先定义的 Port、事件、导航注册和权限注册接入已完成模块，但不得：

- 重写已完成模块的数据模型；
- 绕过公开入口导入内部文件；
- 为方便新模块向旧表持续加无关字段；
- 把跨模块逻辑塞入旧模块 Service；
- 进行第二轮统一 UI 或 API 补做。

如果发现必须结构性重写，暂停实施并先修改计划，不能用连续补丁掩盖设计问题。

## 11. 分步实施顺序

### 阶段 0：仓库与 Admin 工程基础

这是唯一一次横跨工程的基础建设，完成后不再反复调整脚手架。

任务：

1. 对齐 Base Starter 工程底座；
2. 建立 `packages/contracts` 和 `packages/api-client`；
3. 完善数据库事务接口和 Schema 聚合规则；
4. 完善模块生成器和边界检查；
5. 在 `apps/admin` 安装 Ant Design、Router、TanStack Query；
6. 建立 Providers、Admin Shell、Navigation Registry；
7. 建立 Page、Table、Drawer、Form、Error 基础组合；
8. 建立 Dashboard、UI Showcase、401/403/404/500；
9. 增加 Playwright 和 Bundle 基线；
10. 保持 `apps/web` 现状，不新增依赖和页面。

验收：

- `/admin` 可运行并看到完整 Shell；
- `/web` 原空白入口不受影响；
- Admin 与 Web 独立构建；
- Web 构建产物不包含 Ant Design；
- Contracts 和 API Client 不依赖 React 或 UI 框架；
- 深层 Admin 路由可在生产静态托管下刷新；
- `pnpm check` 通过。

### 阶段 1：Identity

一次完整交付 Identity 后再进入阶段 2。

完成内容：

1. 账号、密码凭据、Session、一次性操作令牌四张表及 Migration；
2. 登录、退出、当前账号、修改密码、密码重置、邮箱验证、活动会话 API；
3. HttpOnly Session Cookie、会话绑定 CSRF、令牌摘要、生产 Cookie 配置约束；
4. 登录和敏感操作限速及标准 429 错误；
5. 幂等 Bootstrap 账号命令；
6. 供 Access Control 调用、但不临时开放 HTTP 的账号查询和管理 Port；
7. Contracts、无 React API Client、Admin 登录门禁、账号安全和活动会话页面；
8. PostgreSQL 集成测试、桌面/移动端 Playwright、生产静态托管和 Docker 验收。

### 阶段 2：Access Control

一次完整交付 Access Control 后再进入阶段 3。

### 阶段 3：Audit

完成审计模块，并通过预先定义的 Audit Port 接入 Identity 和 Access。接入只允许修改 Composition 和调用点，不修改两者数据模型。

### 阶段 4：Settings

完成类型化设置、Secret 和 Admin 设置页。

### 阶段 5：Idempotency

完成通用幂等执行器和诊断页。

### 阶段 6：Jobs

完成 PostgreSQL Jobs、Worker 和管理页。

### 阶段 7：Transactional Outbox

完成事务事件、Publisher 和重放管理。

### 阶段 8：Mail

完成邮件设置、模板、发送、重试和 Deliveries 管理。

### 阶段 9：Notifications

完成站内通知、公告、未读状态和邮件渠道编排。

### 阶段 10：Storage 与 Asset Management

完成 Provider-neutral Storage、资源库和 Asset Picker。

### 阶段 11：Application Branding

完成品牌设置并直接使用阶段 10 的 Asset Reference，不使用临时 Logo 字段，避免二次改造。

### 阶段 12：Payments

完成支付、退款、回调、对账、管理页面和 Mock Provider。

### 阶段 13：Webhook Inbox 决策

先用 Payments 的真实回调验证通用收件箱价值，再决定：

- 作为默认模块实施；或
- 保持 Payments 内部回调事实；或
- 仅保留 Adapter Contract。

### 阶段 14：CLI 与产品化交付

任务：

- Business Starter CLI；
- 项目标识替换；
- 维护者文件清理；
- Generated Project Smoke；
- npm 真实包生成测试；
- Docker API/Worker/Admin/Web/PostgreSQL 验收；
- 部署、升级、回滚和凭据轮换文档。

### 阶段 15：真实项目验证

按垂直模块选择真实项目验证，不进行全项目一次性迁移：

1. Core Stack 验证 Identity、Access、Settings、Branding 和 Storage；
2. Retail 验证 Admin Resource UI、Jobs、Payments 和 Storage；
3. Edu 验证 Identity、Access、Audit、Notifications、Payments；
4. 行业模型继续留在各自项目；
5. 发现通用问题先回写 Starter，再继续迁移下一模块。

## 12. 测试策略

### 12.1 Server

- Domain 单元测试；
- Repository PostgreSQL 集成测试；
- Fastify inject API 测试；
- Migration 空库和升级测试；
- 事务回滚测试；
- 并发和幂等测试；
- Worker Crash Recovery 测试；
- Adapter Contract Test。

不使用 SQLite 替代 PostgreSQL 验证数据库语义。

### 12.2 Contracts 与 API Client

- 请求和响应 Parse 测试；
- 错误响应测试；
- Pagination 和 Sorting 测试；
- AbortSignal 测试；
- Cookie、CSRF 和 Session 恢复测试；
- 禁止依赖 React、Ant Design 和服务端内部类型的边界测试。

### 12.3 Admin

- Vitest + Testing Library；
- 表单字段错误和全局错误；
- Loading、Empty、Error；
- 权限隐藏和禁用；
- Drawer、Modal、Table；
- 键盘导航；
- 360px、768px、1280px 视口；
- 路由级懒加载；
- Bundle 大小记录。

### 12.4 Playwright

每个模块增加对应关键路径，不等最后统一补 E2E：

- 登录和退出；
- 用户、角色和权限；
- 设置和审计；
- 任务重试；
- 通知发布；
- 文件上传和选择；
- 支付 Mock 流程；
- Admin 深层路由刷新。

## 13. 安全基线

- Cookie 使用 HttpOnly、Secure、SameSite；
- 状态修改请求实施 CSRF 防护；
- 密码采用成熟 KDF；
- 登录、重置密码、验证码和 Provider 测试接口限速；
- Secret 加密保存且只写不读；
- 权限后端默认拒绝；
- 文件上传检查 MIME、大小和访问策略；
- 支付回调保留原始 Body 并验证签名；
- 日志、审计和错误响应不泄露凭据；
- 依赖审计、Secret Scan 和安全响应头进入 CI。

## 14. 代码质量约束

- 单文件建议不超过 300 行，超过 500 行必须拆分或说明；
- Route 只做协议转换；
- Application Service 负责用例和事务；
- Repository 只处理持久化；
- 不建立万能 BaseRepository；
- 不建立万能 CrudService；
- 不建立全局 Service Locator；
- 不通过 Fastify Instance 暴露所有服务；
- 不使用大型 `index.ts` 承载业务实现；
- 不复制 Ant Design 基础组件源码；
- 不把行业字段加入通用模块。

## 15. 每模块交付清单

每个模块完成时检查：

```text
[ ] 职责和非职责已记录
[ ] Schema 所有权明确
[ ] Migration 完成
[ ] Repository 完成
[ ] Application Service 完成
[ ] Fastify Routes 完成
[ ] Contracts 完成
[ ] API Client 完成
[ ] Admin 菜单和页面完成
[ ] Permission 完成
[ ] Audit 接入完成（适用时）
[ ] Unit Test 完成
[ ] PostgreSQL Integration Test 完成
[ ] API Test 完成
[ ] Admin Interaction Test 完成
[ ] Playwright 关键路径完成
[ ] 文档完成
[ ] pnpm check 通过
[ ] /admin 人工验收通过
```

## 16. CI 验收命令

最终至少包含：

```bash
corepack pnpm check:toolchain
corepack pnpm check:boundaries
corepack pnpm smoke:module-generator
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm e2e
corepack pnpm smoke:generated
corepack pnpm smoke:docker
corepack pnpm audit --prod --audit-level high
git diff --check
```

## 17. 实施优先级

```text
P0  仓库基础、Contracts、API Client、数据库事务
P0  Ant Design Admin Foundation、Admin Shell、Showcase
P0  Identity
P0  Access Control
P0  Audit
P1  Settings
P1  Idempotency
P1  Jobs
P1  Transactional Outbox
P1  Mail
P1  Notifications
P1  Storage 与 Asset Management
P1  Application Branding
P1  Payments
P2  Webhook Inbox（Payments 验证后决策）
P2  CLI 产品化和真实项目迁移验证
不在范围  SaaS、多租户、CMS、Entitlement、AI Gateway、行业模块
```

## 18. 开始实施的唯一入口

计划批准后，从“阶段 0：仓库与 Admin 工程基础”开始。

阶段 0 完成并验收前，不创建 Identity 表；Identity 完成并验收前，不开始 Access Control；后续严格按照阶段顺序逐模块闭环，不并行铺设多个模块骨架。
