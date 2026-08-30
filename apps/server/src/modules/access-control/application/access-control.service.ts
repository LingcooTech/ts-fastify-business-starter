import { ApiError } from '@lingcoo-tech/http';
import type {
  CreateAccessUserRequest,
  CreateRoleRequest,
  PermissionKey,
  UpdateAccessUserRequest,
  UpdateRoleRequest,
} from '@ts-fastify-business-starter/contracts';

import type { IdentityService, PublicIdentityUser } from '../../identity/public.js';
import type { DatabaseHandle } from '../../../database/database.js';
import type {
  AccessRole,
  AccessRoleSummary,
  AccessUserRole,
  PermissionDefinition,
} from '../domain/model.js';
import { CORE_PERMISSION_DEFINITIONS, OWNER_ROLE_KEY } from '../domain/system-permissions.js';
import type { AccessControlRepository } from '../infrastructure/persistence/access-control.repository.js';

export interface AccessUser extends PublicIdentityUser {
  roles: AccessUserRole[];
}

export interface AccessUserPage {
  items: AccessUser[];
  page: number;
  pageSize: number;
  total: number;
}

export class AccessControlService {
  constructor(
    private readonly repository: AccessControlRepository,
    private readonly identity: IdentityService,
    private readonly database: DatabaseHandle,
  ) {}

  synchronizeSystemAccess(): Promise<void> {
    return this.repository.synchronizeCatalog('core', CORE_PERMISSION_DEFINITIONS);
  }

  assignOwner(userId: string): Promise<void> {
    return this.repository.assignOwner(userId);
  }

  permissionsForUser(userId: string): Promise<PermissionKey[]> {
    return this.repository.permissionsForUser(userId);
  }

  permissionCatalog(): Promise<PermissionDefinition[]> {
    return this.repository.permissionCatalog();
  }

  listRoles(): Promise<AccessRoleSummary[]> {
    return this.repository.listRoles();
  }

  async getRole(roleId: string): Promise<AccessRole> {
    const role = await this.repository.findRole(roleId);
    if (!role) throw new ApiError(404, 'ACCESS_ROLE_NOT_FOUND', '角色不存在');
    return role;
  }

  async createRole(input: CreateRoleRequest): Promise<AccessRole> {
    if (input.key.startsWith('system.')) {
      throw new ApiError(400, 'ACCESS_RESERVED_ROLE_KEY', 'system.* 为系统角色保留命名空间');
    }
    try {
      return await this.repository.createRole(input);
    } catch (error) {
      this.translateRepositoryError(error);
      throw error;
    }
  }

  async updateRole(roleId: string, input: UpdateRoleRequest): Promise<AccessRole> {
    await this.assertMutableRole(roleId);
    const role = await this.repository.updateRole(roleId, input);
    if (!role) throw new ApiError(404, 'ACCESS_ROLE_NOT_FOUND', '角色不存在');
    return role;
  }

  async replaceRolePermissions(roleId: string, permissions: PermissionKey[]): Promise<AccessRole> {
    await this.assertMutableRole(roleId);
    try {
      const role = await this.repository.replaceRolePermissions(roleId, permissions);
      if (!role) throw new ApiError(404, 'ACCESS_ROLE_NOT_FOUND', '角色不存在');
      return role;
    } catch (error) {
      this.translateRepositoryError(error);
      throw error;
    }
  }

  async deleteRole(roleId: string): Promise<void> {
    await this.assertMutableRole(roleId);
    if (!(await this.repository.deleteRole(roleId))) {
      throw new ApiError(404, 'ACCESS_ROLE_NOT_FOUND', '角色不存在');
    }
  }

  async listUsers(input: {
    page: number;
    pageSize: number;
    search?: string;
    status?: 'active' | 'disabled';
  }): Promise<AccessUserPage> {
    const page = await this.identity.listUsers(input);
    const roles = await this.repository.rolesForUsers(page.items.map((user) => user.id));
    return {
      ...page,
      items: page.items.map((user) => ({ ...user, roles: roles.get(user.id) ?? [] })),
    };
  }

  async getUser(userId: string): Promise<AccessUser> {
    const user = await this.identity.getUser(userId);
    const roles = await this.repository.rolesForUsers([userId]);
    return { ...user, roles: roles.get(userId) ?? [] };
  }

  async createUser(input: CreateAccessUserRequest): Promise<AccessUser> {
    const userId = await this.database.transaction(async (transaction) => {
      if (!(await this.repository.validateRoleIds(input.roleIds, transaction))) {
        throw new ApiError(400, 'ACCESS_UNKNOWN_ROLE', '包含不存在的角色');
      }
      const user = await this.identity.createUser(input, { executor: transaction });
      await this.repository.replaceUserRoles(user.id, input.roleIds, transaction);
      return user.id;
    });
    return this.getUser(userId);
  }

  synchronizePermissions(source: string, definitions: PermissionDefinition[]): Promise<void> {
    if (definitions.some((definition) => definition.source !== source)) {
      throw new Error('Permission definition source does not match the registry source');
    }
    return this.repository.synchronizeCatalog(source, definitions);
  }

  async updateUser(
    actorUserId: string,
    userId: string,
    input: UpdateAccessUserRequest,
  ): Promise<AccessUser> {
    if (input.status === 'disabled') {
      if (actorUserId === userId) {
        throw new ApiError(400, 'ACCESS_SELF_DISABLE', '不能停用当前登录账号');
      }
      if (await this.repository.userHasOwnerRole(userId)) {
        throw new ApiError(400, 'ACCESS_OWNER_PROTECTED', 'Owner 账号不能被停用');
      }
    }
    await this.identity.updateUser({ userId, ...input });
    return this.getUser(userId);
  }

  async replaceUserRoles(userId: string, roleIds: string[]): Promise<AccessUser> {
    await this.identity.getUser(userId);
    const current = await this.getUser(userId);
    if (current.roles.some((role) => role.key === OWNER_ROLE_KEY)) {
      const roles = await this.repository.listRoles();
      const owner = roles.find((role) => role.key === OWNER_ROLE_KEY);
      if (owner && !roleIds.includes(owner.id)) {
        throw new ApiError(400, 'ACCESS_OWNER_PROTECTED', 'Owner 角色不能通过管理接口移除');
      }
    }
    try {
      await this.repository.replaceUserRoles(userId, roleIds);
      return this.getUser(userId);
    } catch (error) {
      this.translateRepositoryError(error);
      throw error;
    }
  }

  private async assertMutableRole(roleId: string): Promise<void> {
    const role = await this.getRole(roleId);
    if (role.system)
      throw new ApiError(400, 'ACCESS_SYSTEM_ROLE_PROTECTED', '系统角色不能修改或删除');
  }

  private translateRepositoryError(error: unknown): void {
    if (error instanceof Error && error.message === 'UNKNOWN_PERMISSION_KEY') {
      throw new ApiError(400, 'ACCESS_UNKNOWN_PERMISSION', '包含未注册的权限');
    }
    if (error instanceof Error && error.message === 'UNKNOWN_ROLE_ID') {
      throw new ApiError(400, 'ACCESS_UNKNOWN_ROLE', '包含不存在的角色');
    }
    if (this.isUniqueViolation(error)) {
      throw new ApiError(409, 'ACCESS_ROLE_KEY_EXISTS', '角色标识已存在');
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    let current = error;
    for (let depth = 0; depth < 3; depth += 1) {
      if (typeof current !== 'object' || current === null) return false;
      if ('code' in current && (current as { code?: unknown }).code === '23505') return true;
      current = 'cause' in current ? (current as { cause?: unknown }).cause : undefined;
    }
    return false;
  }
}
