import { DefaultRoleService } from '../services/rbac';
import {
  Role,
  Permission,
  UserRole,
  RoleRepository,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignRoleRequest,
  SystemRole,
  SystemPermission,
  NotFoundError,
  ConflictError,
  RoleNotFoundError,
  RoleAssignmentError,
  ValidationError,
} from '../types';

// Mock repository for testing
class MockRoleRepository implements RoleRepository {
  private roles: Map<string, Role> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private userRoles: Map<string, UserRole[]> = new Map();
  private rolePermissions: Map<string, string[]> = new Map();

  async createRole(roleData: Partial<Role>): Promise<Role> {
    // Check if role name already exists
    for (const role of this.roles.values()) {
      if (role.name === roleData.name) {
        throw new ConflictError(`Role with name '${roleData.name}' already exists`);
      }
    }

    const role: Role = {
      id: crypto.randomUUID(),
      name: roleData.name!,
      description: roleData.description || '',
      permissions: roleData.permissions || [],
      isSystemRole: roleData.isSystemRole || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.roles.set(role.id, role);
    this.rolePermissions.set(role.id, role.permissions);
    return role;
  }

  async findRoleById(roleId: string): Promise<Role | null> {
    const role = this.roles.get(roleId);
    if (role) {
      role.permissions = this.rolePermissions.get(roleId) || [];
    }
    return role || null;
  }

  async findRoleByName(name: string): Promise<Role | null> {
    for (const role of this.roles.values()) {
      if (role.name === name) {
        role.permissions = this.rolePermissions.get(role.id) || [];
        return role;
      }
    }
    return null;
  }

  async updateRole(roleId: string, roleData: Partial<Role>): Promise<Role> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Check name conflict
    if (roleData.name) {
      for (const [id, existingRole] of this.roles.entries()) {
        if (id !== roleId && existingRole.name === roleData.name) {
          throw new ConflictError(`Role with name '${roleData.name}' already exists`);
        }
      }
    }

    const updatedRole = {
      ...role,
      ...roleData,
      updatedAt: new Date(),
    };

    this.roles.set(roleId, updatedRole);
    
    if (roleData.permissions !== undefined) {
      this.rolePermissions.set(roleId, roleData.permissions);
      updatedRole.permissions = roleData.permissions;
    } else {
      updatedRole.permissions = this.rolePermissions.get(roleId) || [];
    }

    return updatedRole;
  }

  async deleteRole(roleId: string): Promise<void> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (role.isSystemRole) {
      throw new ConflictError('Cannot delete system role');
    }

    this.roles.delete(roleId);
    this.rolePermissions.delete(roleId);
    
    // Remove user role assignments
    for (const [userId, roles] of this.userRoles.entries()) {
      this.userRoles.set(userId, roles.filter(ur => ur.roleId !== roleId));
    }
  }

  async listRoles(): Promise<Role[]> {
    const roles = Array.from(this.roles.values());
    roles.forEach(role => {
      role.permissions = this.rolePermissions.get(role.id) || [];
    });
    return roles.sort((a, b) => a.name.localeCompare(b.name));
  }

  async createPermission(permissionData: Partial<Permission>): Promise<Permission> {
    // Check if permission already exists
    for (const permission of this.permissions.values()) {
      if (permission.name === permissionData.name) {
        throw new ConflictError(`Permission '${permissionData.name}' already exists`);
      }
    }

    const permission: Permission = {
      id: crypto.randomUUID(),
      name: permissionData.name!,
      description: permissionData.description || '',
      resource: permissionData.resource || '',
      action: permissionData.action || '',
      createdAt: new Date(),
    };

    this.permissions.set(permission.id, permission);
    return permission;
  }

  async findPermissionById(permissionId: string): Promise<Permission | null> {
    return this.permissions.get(permissionId) || null;
  }

  async findPermissionByName(name: string): Promise<Permission | null> {
    for (const permission of this.permissions.values()) {
      if (permission.name === name) {
        return permission;
      }
    }
    return null;
  }

  async listPermissions(): Promise<Permission[]> {
    return Array.from(this.permissions.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async assignRole(userId: string, roleId: string, assignedBy: string, expiresAt?: Date): Promise<UserRole> {
    // Check if role assignment already exists
    const userRolesList = this.userRoles.get(userId) || [];
    const existingAssignment = userRolesList.find(ur => ur.roleId === roleId);
    if (existingAssignment) {
      throw new ConflictError('User already has this role');
    }

    // Verify role exists
    if (!this.roles.has(roleId)) {
      throw new NotFoundError('Role not found');
    }

    const userRole: UserRole = {
      id: crypto.randomUUID(),
      userId,
      roleId,
      assignedBy,
      assignedAt: new Date(),
      expiresAt,
    };

    userRolesList.push(userRole);
    this.userRoles.set(userId, userRolesList);
    return userRole;
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    const userRolesList = this.userRoles.get(userId) || [];
    const filteredRoles = userRolesList.filter(ur => ur.roleId !== roleId);
    
    if (filteredRoles.length === userRolesList.length) {
      throw new NotFoundError('Role assignment not found');
    }
    
    this.userRoles.set(userId, filteredRoles);
  }

  async findUserRoles(userId: string): Promise<UserRole[]> {
    const userRolesList = this.userRoles.get(userId) || [];
    const now = new Date();
    
    // Filter out expired roles
    return userRolesList.filter(ur => !ur.expiresAt || ur.expiresAt > now);
  }

  async findRoleUsers(roleId: string): Promise<UserRole[]> {
    const result: UserRole[] = [];
    const now = new Date();
    
    for (const userRolesList of this.userRoles.values()) {
      const roleAssignments = userRolesList.filter(ur => 
        ur.roleId === roleId && (!ur.expiresAt || ur.expiresAt > now)
      );
      result.push(...roleAssignments);
    }
    
    return result;
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const userRolesList = await this.findUserRoles(userId);
    const permissions = new Set<string>();
    
    for (const userRole of userRolesList) {
      const rolePermissions = this.rolePermissions.get(userRole.roleId) || [];
      rolePermissions.forEach(permission => permissions.add(permission));
    }
    
    return Array.from(permissions);
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.includes(permission);
  }

  async hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
    if (permissions.length === 0) return false;
    
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.some(permission => userPermissions.includes(permission));
  }

  async hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
    if (permissions.length === 0) return true;
    
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.every(permission => userPermissions.includes(permission));
  }

  reset() {
    this.roles.clear();
    this.permissions.clear();
    this.userRoles.clear();
    this.rolePermissions.clear();
  }
}

describe('RBAC Service', () => {
  let roleService: DefaultRoleService;
  let mockRepository: MockRoleRepository;

  beforeEach(() => {
    mockRepository = new MockRoleRepository();
    roleService = new DefaultRoleService(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  describe('Role Management', () => {
    test('should create a new role', async () => {
      const roleData: CreateRoleRequest = {
        name: 'test-role',
        description: 'Test role for testing',
        permissions: [],
      };

      const role = await roleService.createRole(roleData, 'admin-user');

      expect(role.name).toBe(roleData.name);
      expect(role.description).toBe(roleData.description);
      expect(role.permissions).toEqual([]);
      expect(role.isSystemRole).toBe(false);
      expect(role.id).toBeDefined();
    });

    test('should not create role with duplicate name', async () => {
      const roleData: CreateRoleRequest = {
        name: 'duplicate-role',
        description: 'Test role',
      };

      await roleService.createRole(roleData, 'admin-user');

      await expect(roleService.createRole(roleData, 'admin-user'))
        .rejects.toThrow(ConflictError);
    });

    test('should get role by ID', async () => {
      const roleData: CreateRoleRequest = {
        name: 'test-role',
        description: 'Test role',
      };

      const createdRole = await roleService.createRole(roleData, 'admin-user');
      const retrievedRole = await roleService.getRole(createdRole.id);

      expect(retrievedRole.id).toBe(createdRole.id);
      expect(retrievedRole.name).toBe(createdRole.name);
    });

    test('should throw error when getting non-existent role', async () => {
      await expect(roleService.getRole('non-existent-id'))
        .rejects.toThrow(RoleNotFoundError);
    });

    test('should update role', async () => {
      const roleData: CreateRoleRequest = {
        name: 'test-role',
        description: 'Original description',
      };

      const createdRole = await roleService.createRole(roleData, 'admin-user');

      const updateData: UpdateRoleRequest = {
        description: 'Updated description',
      };

      const updatedRole = await roleService.updateRole(createdRole.id, updateData, 'admin-user');

      expect(updatedRole.description).toBe(updateData.description);
      expect(updatedRole.name).toBe(roleData.name); // Should remain unchanged
    });

    test('should not update system role', async () => {
      // Create a system role
      await mockRepository.createRole({
        name: 'system-role',
        description: 'System role',
        isSystemRole: true,
      });

      const systemRole = await roleService.getRoleByName('system-role');

      await expect(roleService.updateRole(systemRole.id, { description: 'New description' }, 'admin-user'))
        .rejects.toThrow(ConflictError);
    });

    test('should delete role', async () => {
      const roleData: CreateRoleRequest = {
        name: 'test-role',
        description: 'Test role',
      };

      const createdRole = await roleService.createRole(roleData, 'admin-user');
      await roleService.deleteRole(createdRole.id, 'admin-user');

      await expect(roleService.getRole(createdRole.id))
        .rejects.toThrow(RoleNotFoundError);
    });

    test('should not delete system role', async () => {
      // Create a system role
      await mockRepository.createRole({
        name: 'system-role',
        description: 'System role',
        isSystemRole: true,
      });

      const systemRole = await roleService.getRoleByName('system-role');

      await expect(roleService.deleteRole(systemRole.id, 'admin-user'))
        .rejects.toThrow(ConflictError);
    });

    test('should list all roles', async () => {
      const role1Data: CreateRoleRequest = { name: 'role1', description: 'Role 1' };
      const role2Data: CreateRoleRequest = { name: 'role2', description: 'Role 2' };

      await roleService.createRole(role1Data, 'admin-user');
      await roleService.createRole(role2Data, 'admin-user');

      const roles = await roleService.listRoles();

      expect(roles).toHaveLength(2);
      expect(roles.map(r => r.name)).toContain('role1');
      expect(roles.map(r => r.name)).toContain('role2');
    });
  });

  describe('User Role Assignment', () => {
    let testRole: Role;
    const testUserId = 'test-user-123';

    beforeEach(async () => {
      // Create permissions first
      await mockRepository.createPermission({
        name: 'user:read',
        description: 'Read users',
        resource: 'user',
        action: 'read',
      });
      await mockRepository.createPermission({
        name: 'profile:read',
        description: 'Read profiles',
        resource: 'profile',
        action: 'read',
      });

      testRole = await roleService.createRole({
        name: 'test-role',
        description: 'Test role',
        permissions: ['user:read', 'profile:read'],
      }, 'admin-user');
    });

    test('should assign role to user', async () => {
      const assignmentData: AssignRoleRequest = {
        userId: testUserId,
        roleId: testRole.id,
      };

      const assignment = await roleService.assignRole(assignmentData, 'admin-user');

      expect(assignment.userId).toBe(testUserId);
      expect(assignment.roleId).toBe(testRole.id);
      expect(assignment.roleName).toBe(testRole.name);
      expect(assignment.assignedBy).toBe('admin-user');
    });

    test('should not assign same role twice', async () => {
      const assignmentData: AssignRoleRequest = {
        userId: testUserId,
        roleId: testRole.id,
      };

      await roleService.assignRole(assignmentData, 'admin-user');

      await expect(roleService.assignRole(assignmentData, 'admin-user'))
        .rejects.toThrow(RoleAssignmentError);
    });

    test('should remove role from user', async () => {
      const assignmentData: AssignRoleRequest = {
        userId: testUserId,
        roleId: testRole.id,
      };

      await roleService.assignRole(assignmentData, 'admin-user');
      await roleService.removeRole(testUserId, testRole.id, 'admin-user');

      const userRoles = await roleService.getUserRoles(testUserId);
      expect(userRoles).toHaveLength(0);
    });

    test('should get user roles', async () => {
      const assignmentData: AssignRoleRequest = {
        userId: testUserId,
        roleId: testRole.id,
      };

      await roleService.assignRole(assignmentData, 'admin-user');
      const userRoles = await roleService.getUserRoles(testUserId);

      expect(userRoles).toHaveLength(1);
      expect(userRoles[0].roleName).toBe(testRole.name);
    });
  });

  describe('Permission Checking', () => {
    let testRole: Role;
    const testUserId = 'test-user-123';

    beforeEach(async () => {
      // Create permissions
      await mockRepository.createPermission({
        name: 'user:read',
        description: 'Read users',
        resource: 'user',
        action: 'read',
      });
      await mockRepository.createPermission({
        name: 'user:write',
        description: 'Write users',
        resource: 'user',
        action: 'write',
      });
      await mockRepository.createPermission({
        name: 'profile:read',
        description: 'Read profiles',
        resource: 'profile',
        action: 'read',
      });

      testRole = await roleService.createRole({
        name: 'test-role',
        description: 'Test role',
        permissions: ['user:read', 'profile:read'],
      }, 'admin-user');

      await roleService.assignRole({
        userId: testUserId,
        roleId: testRole.id,
      }, 'admin-user');
    });

    test('should check single permission', async () => {
      const hasPermission = await roleService.hasPermission(testUserId, 'user:read');
      expect(hasPermission).toBe(true);

      const hasNoPermission = await roleService.hasPermission(testUserId, 'user:write');
      expect(hasNoPermission).toBe(false);
    });

    test('should check any permission', async () => {
      const hasAnyPermission = await roleService.hasAnyPermission(testUserId, ['user:read', 'user:write']);
      expect(hasAnyPermission).toBe(true);

      const hasNoPermissions = await roleService.hasAnyPermission(testUserId, ['user:write', 'admin:access']);
      expect(hasNoPermissions).toBe(false);
    });

    test('should check all permissions', async () => {
      const hasAllPermissions = await roleService.hasAllPermissions(testUserId, ['user:read', 'profile:read']);
      expect(hasAllPermissions).toBe(true);

      const hasNotAllPermissions = await roleService.hasAllPermissions(testUserId, ['user:read', 'user:write']);
      expect(hasNotAllPermissions).toBe(false);
    });

    test('should get user permissions', async () => {
      const userPermissions = await roleService.getUserPermissions(testUserId);

      expect(userPermissions.userId).toBe(testUserId);
      expect(userPermissions.roles).toHaveLength(1);
      expect(userPermissions.roles[0].name).toBe(testRole.name);
      expect(userPermissions.allPermissions).toContain('user:read');
      expect(userPermissions.allPermissions).toContain('profile:read');
      expect(userPermissions.allPermissions).not.toContain('user:write');
    });
  });

  describe('System Initialization', () => {
    test('should initialize system roles', async () => {
      await roleService.initializeSystemRoles();

      // Check that system roles were created
      const adminRole = await roleService.getRoleByName(SystemRole.ADMIN);
      expect(adminRole.isSystemRole).toBe(true);

      const userRole = await roleService.getRoleByName(SystemRole.USER);
      expect(userRole.isSystemRole).toBe(true);

      // Check that permissions were created
      const permissions = await mockRepository.listPermissions();
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions.some(p => p.name === SystemPermission.USER_READ)).toBe(true);
    });

    test('should ensure user has default role', async () => {
      await roleService.initializeSystemRoles();
      
      const testUserId = 'test-user-123';
      await roleService.ensureUserHasDefaultRole(testUserId);

      const userRoles = await roleService.getUserRoles(testUserId);
      expect(userRoles).toHaveLength(1);
      expect(userRoles[0].roleName).toBe(SystemRole.USER);
    });
  });
});