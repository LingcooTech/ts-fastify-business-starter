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

复制 `deploy/production.env.example`，至少设置数据库密码、CORS origin、`APP_PUBLIC_URL`、镜像和监听端口。
`APP_PUBLIC_URL` 用于生成密码重置与邮箱验证链接，生产环境不可省略。生产默认关闭 API docs，并通过 Caddy
终止 HTTP/HTTPS。

Mail 默认使用 `capture`，不会向外发送。启用真实邮件前，把 `MAIL_TRANSPORT` 改为 `smtp`，并配置 SMTP
Host、Port、TLS、凭据和 From；SMTP 密码也可以在部署后通过 Admin 的 Secret Setting 加密保存。

Dockerfile 默认使用官方 `node:24-alpine`、`docker-compose.prod.yml` 默认使用官方 PostgreSQL 和 Caddy
镜像。网络受限或国内部署时，可在构建和 Compose 环境中覆盖 `NODE_IMAGE`、`POSTGRES_IMAGE`、`CADDY_IMAGE`
为可访问的镜像缓存或企业镜像仓库；不要修改业务代码或把单一地区镜像写死在 Starter 中。例如本地 Docker
Smoke 可运行：

```bash
NODE_IMAGE=mirror.gcr.io/library/node:24-alpine \
POSTGRES_IMAGE=postgres:17-alpine \
CADDY_IMAGE=mirror.gcr.io/library/caddy:2-alpine \
pnpm smoke:docker
```

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
