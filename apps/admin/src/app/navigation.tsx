import {
  AppstoreOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  LaptopOutlined,
  TeamOutlined,
  UserOutlined,
  FileSearchOutlined,
  SettingOutlined,
  HistoryOutlined,
  FieldTimeOutlined,
  SwapOutlined,
  MailOutlined,
} from '@ant-design/icons';
import type { PermissionKey } from '@ts-fastify-business-starter/contracts';
import type { ReactNode } from 'react';

export interface AdminNavigationItem {
  key: string;
  label: string;
  path: string;
  icon?: ReactNode;
  permission?: PermissionKey;
}

export const foundationNavigation: AdminNavigationItem[] = [
  { key: 'dashboard', label: '概览', path: '/', icon: <DashboardOutlined /> },
  { key: 'showcase', label: 'UI 基础', path: '/showcase', icon: <AppstoreOutlined /> },
  {
    key: 'access-users',
    label: '账号管理',
    path: '/access/users',
    icon: <UserOutlined />,
    permission: 'accounts.read',
  },
  {
    key: 'access-roles',
    label: '角色与权限',
    path: '/access/roles',
    icon: <TeamOutlined />,
    permission: 'roles.read',
  },
  {
    key: 'audit',
    label: '审计日志',
    path: '/audit',
    icon: <FileSearchOutlined />,
    permission: 'audit.read',
  },
  {
    key: 'settings',
    label: '系统设置',
    path: '/settings',
    icon: <SettingOutlined />,
    permission: 'settings.read',
  },
  {
    key: 'idempotency',
    label: '幂等诊断',
    path: '/idempotency',
    icon: <HistoryOutlined />,
    permission: 'idempotency.read',
  },
  {
    key: 'jobs',
    label: '后台任务',
    path: '/jobs',
    icon: <FieldTimeOutlined />,
    permission: 'jobs.read',
  },
  {
    key: 'outbox',
    label: 'Outbox 事件',
    path: '/outbox',
    icon: <SwapOutlined />,
    permission: 'outbox.read',
  },
  {
    key: 'mail',
    label: '邮件服务',
    path: '/mail',
    icon: <MailOutlined />,
    permission: 'mail.read',
  },
  {
    key: 'account-security',
    label: '账号安全',
    path: '/account/security',
    icon: <SafetyCertificateOutlined />,
  },
  {
    key: 'active-sessions',
    label: '活动会话',
    path: '/account/sessions',
    icon: <LaptopOutlined />,
  },
];

export function selectedNavigationKey(pathname: string): string {
  const matched = foundationNavigation.find((item) =>
    item.path === '/' ? pathname === '/' : pathname.startsWith(item.path),
  );
  return matched?.key ?? '';
}
