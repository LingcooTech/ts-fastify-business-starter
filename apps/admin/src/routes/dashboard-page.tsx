import { ApiOutlined, DatabaseOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@ts-fastify-business-starter/api-client';
import { readinessResponseSchema } from '@ts-fastify-business-starter/contracts';
import { Button, Card, Flex, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';

import { AsyncState } from '../components/AsyncState';
import { PageContainer } from '../components/PageContainer';
import { StatusTag } from '../components/StatusTag';

const apiClient = createApiClient();

export function DashboardPage() {
  const readiness = useQuery({
    queryKey: ['system', 'readiness'],
    queryFn: ({ signal }) =>
      apiClient.request({ path: '/health/ready', schema: readinessResponseSchema, signal }),
    refetchInterval: 30_000,
  });

  return (
    <PageContainer
      title="工程基础"
      description="工程底座与 Identity 认证闭环已就绪，后续模块继续按边界纵向交付。"
      actions={
        <Link to="/showcase">
          <Button type="primary">查看 UI 基础</Button>
        </Link>
      }
    >
      <Card className="dashboard-hero">
        <span className="dashboard-hero__eyebrow">FASTIFY MODULAR MONOLITH</span>
        <h2>后台基础已经可以被持续验收</h2>
        <p>Admin 与 Web 保持独立入口。Identity 已完成数据库、API、客户端、页面和安全测试闭环。</p>
      </Card>

      <div className="foundation-grid">
        <Card className="foundation-card">
          <div className="foundation-card__icon">
            <ApiOutlined />
          </div>
          <Flex justify="space-between" align="center" gap={12}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              API
            </Typography.Title>
            <AsyncState loading={readiness.isLoading} error={readiness.error}>
              <StatusTag tone="success">运行正常</StatusTag>
            </AsyncState>
          </Flex>
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            Fastify 健康检查通过共享 Contract 校验后展示。
          </Typography.Paragraph>
        </Card>
        <Card className="foundation-card">
          <div className="foundation-card__icon">
            <DatabaseOutlined />
          </div>
          <Space orientation="vertical" size={10}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              PostgreSQL
            </Typography.Title>
            <StatusTag tone={readiness.data ? 'success' : 'neutral'}>
              {readiness.data ? '连接正常' : '等待检查'}
            </StatusTag>
          </Space>
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            后续模块共享明确的事务入口，不在 Route 中编排一致性。
          </Typography.Paragraph>
        </Card>
        <Card className="foundation-card">
          <div className="foundation-card__icon">
            <SafetyCertificateOutlined />
          </div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            下一个模块
          </Typography.Title>
          <div style={{ marginTop: 10 }}>
            <StatusTag tone="processing">Access Control</StatusTag>
          </div>
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            下一阶段集中完成角色、权限、用户管理与前后端权限门禁。
          </Typography.Paragraph>
        </Card>
      </div>
    </PageContainer>
  );
}
