import {
  AppstoreOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  LaptopOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

export interface AdminNavigationItem {
  key: string;
  label: string;
  path: string;
  icon?: ReactNode;
  permission?: string;
}

export const foundationNavigation: AdminNavigationItem[] = [
  { key: 'dashboard', label: '概览', path: '/', icon: <DashboardOutlined /> },
  { key: 'showcase', label: 'UI 基础', path: '/showcase', icon: <AppstoreOutlined /> },
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
