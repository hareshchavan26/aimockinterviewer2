import { Pool } from 'pg';
import {
  Role,
  Permission,
  UserRole,
  RoleRepository,
  NotFoundError,
  ConflictError,
} from '../types';
import { logger } from '../utils/logger';

export class PostgresRoleRepository implements RoleRepository {
  constructor(private pool: Pool) {}

  // Role operations
  async createRole(roleData: Partial<Role>): Promise<Role> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check if role name already exists
      const existingRole = await client.query(
        'SELECT id FROM roles WHERE name = $1',
        [roleData.name]
      );

      if (existingRole.rows.length > 0) {
        throw new ConflictError(`Role with name '${roleData.name}' already exists`);
      }

      // Create the role
      const roleResult = await client.query(
        `INSERT INTO roles (id, name, description, is_system_role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [
          crypto.randomUUID(),
          roleData.name,
          roleData.description || '',
          roleData.isSystemRole || false,
        ]
      );

      const role = this.mapRoleFromDb(roleResult.rows[0]);

      // Add permissions if provided
      if (roleData.permissions && roleData.permissions.length > 0) {
        await this.updateRolePermissions(client, role.id, roleData.permissions);
        role.permissions = roleData.permissions;
      } else {
        role.permissions = [];
      }

      await client.query('COMMIT');
      return role;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create role', { error, roleData });
      throw error;
    } finally {
      client.release();
    }
  }

  async findRoleById(roleId: string): Promise<Role | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM roles WHERE id = $1',
        [roleId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const role = this.mapRoleFromDb(result.rows[0]);
      role.permissions = await this.getRolePermissions(client, roleId);
      return role;
    } finally {
      client.release();
    }
  }

  async findRoleByName(name: string): Promise<Role | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM roles WHERE name = $1',
        [name]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const role = this.mapRoleFromDb(result.rows[0]);
      role.permissions = await this.getRolePermissions(client, role.id);
      return role;
    } finally {
      client.release();
    }
  }

  async updateRole(roleId: string, roleData: Partial<Role>): Promise<Role> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check if role exists
      const existingRole = await client.query(
        'SELECT * FROM roles WHERE id = $1',
        [roleId]
      );

      if (existingRole.rows.length === 0) {
        throw new NotFoundError('Role not found');
      }

      // Check if new name conflicts with existing role
      if (roleData.name) {
        const nameConflict = await client.query(
          'SELECT id FROM roles WHERE name = $1 AND id != $2',
          [roleData.name, roleId]
        );

        if (nameConflict.rows.length > 0) {
          throw new ConflictError(`Role with name '${roleData.name}' already exists`);
        }
      }

      // Update role
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (roleData.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(roleData.name);
      }
      if (roleData.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(roleData.description);
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(roleId);

      const result = await client.query(
        `UPDATE roles SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        updateValues
      );

      const role = this.mapRoleFromDb(result.rows[0]);

      // Update permissions if provided
      if (roleData.permissions !== undefined) {
        await this.updateRolePermissions(client, roleId, roleData.permissions);
        role.permissions = roleData.permissions;
      } else {
        role.permissions = await this.getRolePermissions(client, roleId);
      }

      await client.query('COMMIT');
      return role;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update role', { error, roleId, roleData });
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteRole(roleId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check if role exists and is not a system role
      const roleResult = await client.query(
        'SELECT is_system_role FROM roles WHERE id = $1',
        [roleId]
      );

      if (roleResult.rows.length === 0) {
        throw new NotFoundError('Role not found');
      }

      if (roleResult.rows[0].is_system_role) {
        throw new ConflictError('Cannot delete system role');
      }

      // Remove role assignments
      await client.query('DELETE FROM user_roles WHERE role_id = $1', [roleId]);

      // Remove role permissions
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

      // Delete role
      await client.query('DELETE FROM roles WHERE id = $1', [roleId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to delete role', { error, roleId });
      throw error;
    } finally {
      client.release();
    }
  }

  async listRoles(): Promise<Role[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM roles ORDER BY name'
      );

      const roles = result.rows.map(row => this.mapRoleFromDb(row));

      // Get permissions for each role
      for (const role of roles) {
        role.permissions = await this.getRolePermissions(client, role.id);
      }

      return roles;
    } finally {
      client.release();
    }
  }

  // Permission operations
  async createPermission(permissionData: Partial<Permission>): Promise<Permission> {
    const client = await this.pool.connect();
    try {
      // Check if permission already exists
      const existingPermission = await client.query(
        'SELECT id FROM permissions WHERE name = $1',
        [permissionData.name]
      );

      if (existingPermission.rows.length > 0) {
        throw new ConflictError(`Permission '${permissionData.name}' already exists`);
      }

      const result = await client.query(
        `INSERT INTO permissions (id, name, description, resource, action, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [
          crypto.randomUUID(),
          permissionData.name,
          permissionData.description || '',
          permissionData.resource || '',
          permissionData.action || '',
        ]
      );

      return this.mapPermissionFromDb(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create permission', { error, permissionData });
      throw error;
    } finally {
      client.release();
    }
  }

  async findPermissionById(permissionId: string): Promise<Permission | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM permissions WHERE id = $1',
        [permissionId]
      );

      return result.rows.length > 0 ? this.mapPermissionFromDb(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async findPermissionByName(name: string): Promise<Permission | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM permissions WHERE name = $1',
        [name]
      );

      return result.rows.length > 0 ? this.mapPermissionFromDb(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async listPermissions(): Promise<Permission[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM permissions ORDER BY resource, action'
      );

      return result.rows.map(row => this.mapPermissionFromDb(row));
    } finally {
      client.release();
    }
  }

  // User role operations
  async assignRole(userId: string, roleId: string, assignedBy: string, expiresAt?: Date): Promise<UserRole> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check if role assignment already exists
      const existingAssignment = await client.query(
        'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2',
        [userId, roleId]
      );

      if (existingAssignment.rows.length > 0) {
        throw new ConflictError('User already has this role');
      }

      // Verify role exists
      const roleExists = await client.query(
        'SELECT id FROM roles WHERE id = $1',
        [roleId]
      );

      if (roleExists.rows.length === 0) {
        throw new NotFoundError('Role not found');
      }

      const result = await client.query(
        `INSERT INTO user_roles (id, user_id, role_id, assigned_by, assigned_at, expires_at)
         VALUES ($1, $2, $3, $4, NOW(), $5)
         RETURNING *`,
        [crypto.randomUUID(), userId, roleId, assignedBy, expiresAt]
      );

      await client.query('COMMIT');
      return this.mapUserRoleFromDb(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to assign role', { error, userId, roleId, assignedBy });
      throw error;
    } finally {
      client.release();
    }
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
        [userId, roleId]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError('Role assignment not found');
      }
    } catch (error) {
      logger.error('Failed to remove role', { error, userId, roleId });
      throw error;
    } finally {
      client.release();
    }
  }

  async findUserRoles(userId: string): Promise<UserRole[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT ur.* FROM user_roles ur
         WHERE ur.user_id = $1 
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
         ORDER BY ur.assigned_at`,
        [userId]
      );

      return result.rows.map(row => this.mapUserRoleFromDb(row));
    } finally {
      client.release();
    }
  }

  async findRoleUsers(roleId: string): Promise<UserRole[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT ur.* FROM user_roles ur
         WHERE ur.role_id = $1 
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
         ORDER BY ur.assigned_at`,
        [roleId]
      );

      return result.rows.map(row => this.mapUserRoleFromDb(row));
    } finally {
      client.release();
    }
  }

  // Permission checking
  async getUserPermissions(userId: string): Promise<string[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT DISTINCT p.name
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1 
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW())`,
        [userId]
      );

      return result.rows.map(row => row.name);
    } finally {
      client.release();
    }
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT 1
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1 
         AND p.name = $2
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
         LIMIT 1`,
        [userId, permission]
      );

      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  async hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
    if (permissions.length === 0) return false;

    const client = await this.pool.connect();
    try {
      const placeholders = permissions.map((_, index) => `$${index + 2}`).join(', ');
      const result = await client.query(
        `SELECT 1
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1 
         AND p.name IN (${placeholders})
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
         LIMIT 1`,
        [userId, ...permissions]
      );

      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  async hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
    if (permissions.length === 0) return true;

    const client = await this.pool.connect();
    try {
      const placeholders = permissions.map((_, index) => `$${index + 2}`).join(', ');
      const result = await client.query(
        `SELECT COUNT(DISTINCT p.name) as permission_count
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1 
         AND p.name IN (${placeholders})
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW())`,
        [userId, ...permissions]
      );

      const permissionCount = parseInt(result.rows[0].permission_count);
      return permissionCount === permissions.length;
    } finally {
      client.release();
    }
  }

  // Helper methods
  private async getRolePermissions(client: any, roleId: string): Promise<string[]> {
    const result = await client.query(
      `SELECT p.name
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1
       ORDER BY p.name`,
      [roleId]
    );

    return result.rows.map((row: any) => row.name);
  }

  private async updateRolePermissions(client: any, roleId: string, permissions: string[]): Promise<void> {
    // Remove existing permissions
    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

    // Add new permissions
    if (permissions.length > 0) {
      // Get permission IDs
      const placeholders = permissions.map((_, index) => `$${index + 1}`).join(', ');
      const permissionResult = await client.query(
        `SELECT id, name FROM permissions WHERE name IN (${placeholders})`,
        permissions
      );

      const permissionMap = new Map(
        permissionResult.rows.map((row: any) => [row.name, row.id])
      );

      // Insert role permissions
      const values = [];
      for (const permission of permissions) {
        const permissionId = permissionMap.get(permission);
        if (permissionId) {
          values.push(`('${crypto.randomUUID()}', '${roleId}', '${permissionId}')`);
        }
      }

      if (values.length > 0) {
        await client.query(
          `INSERT INTO role_permissions (id, role_id, permission_id) VALUES ${values.join(', ')}`
        );
      }
    }
  }

  private mapRoleFromDb(row: any): Role {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: [], // Will be populated separately
      isSystemRole: row.is_system_role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapPermissionFromDb(row: any): Permission {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      resource: row.resource,
      action: row.action,
      createdAt: row.created_at,
    };
  }

  private mapUserRoleFromDb(row: any): UserRole {
    return {
      id: row.id,
      userId: row.user_id,
      roleId: row.role_id,
      assignedBy: row.assigned_by,
      assignedAt: row.assigned_at,
      expiresAt: row.expires_at,
    };
  }
}