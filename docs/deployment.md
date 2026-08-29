# 部署指南

生产环境只运行 CI 构建的镜像，不在服务器安装依赖或编译源码。

```text
Git push
  → CI check/test/build
  → Docker image
  → Registry
  → migrate → bootstrap
  → API + Worker + Caddy
  → readiness check
```

## 本地生产验证

```bash
pnpm smoke:docker
```

该命令构建生产镜像、启动 PostgreSQL、运行 migration 和幂等 bootstrap、启动 API/Worker/Caddy、检查 readiness，并在结束后清理临时容器和卷。

## 生产配置

复制 `deploy/production.env.example`，至少设置数据库密码、CORS origin、镜像和监听端口。生产默认关闭 API docs，并通过 Caddy 终止 HTTP/HTTPS。

容器基线：

- non-root user；
- read-only filesystem；
- no-new-privileges；
- drop all capabilities；
- API readiness healthcheck；
- server production dependencies only。

Migration 必须在新版本 API 启动前完成。数据库变更应保持向前兼容，使旧实例和新实例可在滚动窗口内短暂并存。

首次部署必须配置随机的 `BOOTSTRAP_OWNER_PASSWORD`。Bootstrap 不会覆盖已存在账号的密码；
Identity 阶段只创建账号，Access Control 阶段完成后同一个命令还会幂等分配系统 Owner 角色。
