# 质量标准

Starter 的完成标准不是源码能够启动，而是生成后的独立项目也能可靠安装、检查、构建和部署。

必须持续通过：

```bash
pnpm check
pnpm smoke:module-generator
pnpm smoke:generated
pnpm smoke:docker
pnpm audit --prod --audit-level high
```

验收范围：

- Node 和 pnpm 版本固定；
- 单一冻结锁文件；
- Format、Lint、strict TypeScript；
- 模块边界自动检查；
- Fastify HTTP contract 测试；
- Admin/Web/Server production build；
- npx 模板生成后无维护者文件和 starter 身份残留；
- 生成项目冻结安装并执行完整 `pnpm check`；
- production-only Docker dependencies；
- migration 可重复执行；
- non-root、只读容器和 readiness；
- 生产依赖不存在未处置的 high 漏洞。
