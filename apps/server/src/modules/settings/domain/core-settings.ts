import { z } from 'zod';

import type { SettingDefinition } from './model.js';

export const CORE_SETTINGS: SettingDefinition[] = [
  {
    key: 'application.name',
    group: 'application',
    groupLabel: '应用信息',
    groupOrder: 10,
    label: '应用名称',
    description: '用于管理后台、公共页面和系统通知中的应用名称。',
    kind: 'public',
    schema: z.string().trim().min(1).max(120),
    environment: 'APP_NAME',
    control: 'text',
  },
  {
    key: 'application.support-email',
    group: 'application',
    groupLabel: '应用信息',
    groupOrder: 10,
    label: '支持邮箱',
    description: '面向用户展示的支持邮箱；未设置时不公开该字段。',
    kind: 'public',
    schema: z.string().trim().toLowerCase().pipe(z.email().max(320)),
    environment: 'SUPPORT_EMAIL',
    control: 'email',
  },
  {
    key: 'application.locale',
    group: 'application',
    groupLabel: '应用信息',
    groupOrder: 10,
    label: '默认语言',
    description: '新页面和通知模板未明确语言时使用的默认语言。',
    kind: 'public',
    schema: z.enum(['zh-CN', 'en-US']),
    defaultValue: 'zh-CN',
    control: 'select',
    options: [
      { label: '简体中文', value: 'zh-CN' },
      { label: 'English', value: 'en-US' },
    ],
  },
  {
    key: 'application.timezone',
    group: 'application',
    groupLabel: '应用信息',
    groupOrder: 10,
    label: '业务时区',
    description: '业务日期、报表和计划任务默认使用的 IANA 时区。',
    kind: 'internal',
    schema: z.enum(['Asia/Shanghai', 'UTC']),
    defaultValue: 'Asia/Shanghai',
    control: 'select',
    options: [
      { label: '中国标准时间（Asia/Shanghai）', value: 'Asia/Shanghai' },
      { label: '协调世界时（UTC）', value: 'UTC' },
    ],
  },
];
