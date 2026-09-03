# CLI 与产品化

Business Starter 通过独立 npm 包 `@lingcoo-tech/create-ts-fastify-business-starter` 生成项目。仓库根包继续保持
`private: true`，不会被误发布。

## 使用 CLI

```bash
npx @lingcoo-tech/create-ts-fastify-business-starter@latest my-business-app
```

CLI 默认初始化 Git 并执行冻结锁文件安装。可选参数：

```text
--skip-install
--no-git
--template-path <local-checkout>  # 仅维护者验证
--help
```

项目目录名必须是 1–100 位小写字母、数字或连字符。CLI 拒绝非空目标目录，不提供 `--force`，所有外部命令都使用参数数组调用，不拼接用户输入到 Shell。

## 可复现模板

npm 包在 `prepack` 阶段从明确的根目录 Allowlist 构建 `template.tar.gz`，并在 `postpack` 清理临时归档。已发布版本使用包内模板，不在用户运行 CLI 时下载 Git 分支，因此 CLI 版本、`templateVersion` 和生成内容保持一致。

`.starter-version`、根版本和 CLI 的 `version/templateVersion` 必须一致，`pnpm check:starter-version` 会拒绝漂移。

生成时会：

1. 替换根项目名、Workspace npm Scope、Docker/Compose 名称、默认 `APP_NAME` 和 Starter 标题；
2. 删除 CLI、版本检查、生成 Smoke、内部实施计划、产品发布文档和维护者治理文件；
3. 删除 Starter 的 Repository/Homepage/Bugs 元数据并重置 Changelog；
4. 保留应用 CI、Docker Verify、Security、部署脚本和运行文档；
5. 默认不复制 `.env`、构建产物、依赖目录、测试报告、Git 历史或符号链接。

CLI 不修改生成项目的业务品牌配置，也不会生成任何密码、Token、私钥或云凭据。

## 发布包验证

```bash
pnpm check
pnpm smoke:generated
pnpm smoke:generated:docker
pnpm e2e
pnpm audit --prod --audit-level high
```

`smoke:generated` 不是直接执行源码 CLI。它会：

1. 执行真实 `npm pack`；
2. 检查 tarball 只包含 CLI、README、LICENSE、Package Metadata 和版本化模板归档；
3. 把 `.tgz` 安装到全新 npm Harness，并通过 `node_modules/.bin` 调用 CLI；
4. 验证非空目录拒绝、维护者文件清理、项目身份和 Workspace Scope 替换；
5. 在生成项目中执行 `pnpm install --frozen-lockfile` 和完整 `pnpm check`。

`smoke:generated:docker` 在相同流程后继续构建并验收生成项目的 PostgreSQL、Migration、Bootstrap、API、Worker、Admin、Web、Caddy 和共享 Storage 卷。

## 版本与发布

采用 SemVer：

- Patch：模板缺陷、文档和不破坏现有契约的修复；
- Minor：向后兼容的新模块或新能力；
- Major：Node/pnpm 基线、公开 Contract、配置或部署模型的不兼容变更。

发布步骤：

1. 更新 `.starter-version`、根 `package.json`、CLI `version/templateVersion` 和 Changelog；
2. 确认 Migration 保持向前兼容，并记录新增环境变量和升级要求；
3. 完成上述全部质量命令，人工检查 `npm pack --dry-run ./create-ts-fastify-business-starter`；
4. 合并到受保护的 `main`，等待 CI、Docker Verify 和 Security 检查；
5. 手动运行 `Publish CLI` 工作流，第一次保持 `publish=false` 验证；
6. 经审核后以 `publish=true` 发布，并选择 `next` 或 `latest` dist-tag；
7. 核对 npm 页面版本、Provenance 和 tarball 内容，再执行一次公开 `npx` Smoke。

发布工作流只接受手动触发，使用 GitHub OIDC/npm Trusted Publishing，不保存长期 `NPM_TOKEN`。npm 版本不可覆盖；发布错误应弃用受影响版本并发布新 Patch，不能重新上传相同版本。

## 生成项目升级策略

CLI 只负责创建新项目，不会覆盖已有项目。升级现有项目时：

1. 用目标 CLI 版本生成一个临时基线项目；
2. 比较临时基线与项目当前记录的 Starter 版本或引入提交；
3. 按模块迁移代码、Migration、环境模板和运维文档；
4. 保留项目自己的领域代码、品牌、部署配置和 Git 历史；
5. 在目标项目执行冻结安装、`pnpm check`、Migration 幂等、E2E 和 Docker Smoke；
6. 将可复用问题先修回 Starter，再继续下一个真实项目。

禁止用新版 CLI 对已有非空目录执行覆盖升级。
