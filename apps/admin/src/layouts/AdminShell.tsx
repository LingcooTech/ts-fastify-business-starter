import {
  BulbOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  Drawer,
  Dropdown,
  Grid,
  Layout,
  Menu,
  Space,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { foundationNavigation, selectedNavigationKey } from '../app/navigation';
import { useThemeMode } from '../app/theme-context';
import { CommandPalette } from '../components/CommandPalette';
import { usePermissions } from '../features/access/PermissionContext';
import { BrandMark, useBranding } from '../features/branding';
import { useLogout, useSession } from '../features/identity/hooks';
import { NotificationBell } from '../features/notifications/NotificationBell';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

function Brand({ collapsed }: { collapsed: boolean }) {
  const branding = useBranding();
  return (
    <div className="admin-brand">
      <BrandMark compact />
      {!collapsed && <span>{branding.appName}</span>}
    </div>
  );
}

export function AdminShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const screens = useBreakpoint();
  const desktop = Boolean(screens.lg);
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const logout = useLogout();
  const { mode, toggle } = useThemeMode();
  const { token } = theme.useToken();
  const permissions = usePermissions();
  const branding = useBranding();
  const visibleNavigation = useMemo(
    () =>
      foundationNavigation.filter((item) => !item.permission || permissions.has(item.permission)),
    [permissions],
  );
  const menuItems = useMemo(
    () =>
      visibleNavigation.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: item.label,
      })),
    [visibleNavigation],
  );
  const selectedKeys = [selectedNavigationKey(location.pathname)].filter(Boolean);
  const menu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={selectedKeys}
      items={menuItems}
      onClick={({ key }) => {
        const item = visibleNavigation.find((entry) => entry.key === key);
        if (item) navigate(item.path);
        setDrawerOpen(false);
      }}
    />
  );
  const siderWidth = collapsed ? 80 : 240;

  return (
    <Layout className="admin-layout" style={{ background: token.colorBgLayout }}>
      <CommandPalette items={visibleNavigation} />
      {desktop ? (
        <Sider className="admin-sider" width={240} collapsedWidth={80} collapsed={collapsed}>
          <Brand collapsed={collapsed} />
          {menu}
        </Sider>
      ) : (
        <Drawer
          placement="left"
          size={280}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          styles={{ body: { padding: 0, background: '#001529' }, header: { display: 'none' } }}
        >
          <Brand collapsed={false} />
          {menu}
        </Drawer>
      )}
      <Layout className="admin-main" style={{ marginInlineStart: desktop ? siderWidth : 0 }}>
        <Header
          className="admin-header"
          style={{
            background: token.colorBgContainer,
            borderBottomColor: token.colorBorderSecondary,
          }}
        >
          <Space>
            <Button
              type="text"
              aria-label={desktop ? '折叠导航' : '打开导航'}
              icon={
                desktop ? (
                  collapsed ? (
                    <MenuUnfoldOutlined />
                  ) : (
                    <MenuFoldOutlined />
                  )
                ) : (
                  <MenuUnfoldOutlined />
                )
              }
              onClick={() => (desktop ? setCollapsed((value) => !value) : setDrawerOpen(true))}
            />
            <Typography.Text type="secondary">{branding.appName} 管理后台</Typography.Text>
          </Space>
          <div className="admin-header__actions">
            <Tooltip title="快速导航（⌘/Ctrl + K）">
              <Button
                type="text"
                aria-label="快速导航"
                icon={<SearchOutlined />}
                onClick={() =>
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
                }
              />
            </Tooltip>
            <Tooltip title={mode === 'light' ? '切换深色主题' : '切换浅色主题'}>
              <Button
                type="text"
                aria-label="切换主题"
                icon={mode === 'light' ? <MoonOutlined /> : <BulbOutlined />}
                onClick={toggle}
              />
            </Tooltip>
            <NotificationBell />
            <Dropdown
              menu={{
                items: [
                  { key: 'account', label: '账号安全' },
                  { key: 'sessions', label: '活动会话' },
                  { type: 'divider' },
                  { key: 'logout', label: '退出登录', danger: true },
                ],
                onClick: ({ key }) => {
                  if (key === 'account') navigate('/account/security');
                  if (key === 'sessions') navigate('/account/sessions');
                  if (key === 'logout') logout.mutate();
                },
              }}
            >
              <Button type="text">
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  {desktop && (
                    <span>{session.data?.user.displayName ?? session.data?.user.email}</span>
                  )}
                </Space>
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content className="admin-content" style={{ background: token.colorBgLayout }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
