// Role-Based Access Control Types

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt: Date;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
}

// Predefined system roles
export enum SystemRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
  PREMIUM_USER = 'premium_user',
  GUEST = 'guest',
}

// Predefined permissions
export enum SystemPermission {
  // User management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_LIST = 'user:list',
  
  // Profile management
  PROFILE_READ = 'profile:read',
  PROFILE_UPDATE = 'profile:update',
  PROFILE_DELETE = 'profile:delete',
  
  // Interview management
  INTERVIEW_CREATE = 'interview:create',
  INTERVIEW_READ = 'interview:read',
  INTERVIEW_UPDATE = 'interview:update',
  INTERVIEW_DELETE = 'interview:delete',
  INTERVIEW_LIST = 'interview:list',
  
  // Report management
  REPORT_READ = 'report:read',
  REPORT_EXPORT = 'report:export',
  REPORT_SHARE = 'report:share',
  
  // Admin functions
  ADMIN_PANEL_ACCESS = 'admin:panel_access',
  ADMIN_USER_MANAGEMENT = 'admin:user_management',
  ADMIN_ROLE_MANAGEMENT = 'admin:role_management',
  ADMIN_SYSTEM_SETTINGS = 'admin:system_settings',
  ADMIN_ANALYTICS = 'admin:analytics',
  
  // Moderation
  MODERATE_CONTENT = 'moderate:content',
  MODERATE_USERS = 'moderate:users',
  MODERATE_REPORTS = 'moderate:reports',
  
  // Premium features
  PREMIUM_FEATURES = 'premium:features',
  PREMIUM_ANALYTICS = 'premium:analytics',
  PREMIUM_EXPORT = 'premium:export',
}

// Request/Response types
export interface CreateRoleRequest {
  name: string;
  description: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface AssignRoleRequest {
  userId: string;
  roleId: string;
  expiresAt?: Date;
}

export interface RoleAssignmentResponse {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
}

export interface UserPermissionsResponse {
  userId: string;
  roles: Array<{
    id: string;
    name: string;
    permissions: string[];
  }>;
  allPermissions: string[];
}

// Service interfaces
export interface RoleRepository {
  // Role operations
  createRole(roleData: Partial<Role>): Promise<Role>;
  findRoleById(roleId: string): Promise<Role | null>;
  findRoleByName(name: string): Promise<Role | null>;
  updateRole(roleId: string, roleData: Partial<Role>): Promise<Role>;
  deleteRole(roleId: string): Promise<void>;
  listRoles(): Promise<Role[]>;
  
  // Permission operations
  createPermission(permissionData: Partial<Permission>): Promise<Permission>;
  findPermissionById(permissionId: string): Promise<Permission | null>;
  findPermissionByName(name: string): Promise<Permission | null>;
  listPermissions(): Promise<Permission[]>;
  
  // User role operations
  assignRole(userId: string, roleId: string, assignedBy: string, expiresAt?: Date): Promise<UserRole>;
  removeRole(userId: string, roleId: string): Promise<void>;
  findUserRoles(userId: string): Promise<UserRole[]>;
  findRoleUsers(roleId: string): Promise<UserRole[]>;
  
  // Permission checking
  getUserPermissions(userId: string): Promise<string[]>;
  hasPermission(userId: string, permission: string): Promise<boolean>;
  hasAnyPermission(userId: string, permissions: string[]): Promise<boolean>;
  hasAllPermissions(userId: string, permissions: string[]): Promise<boolean>;
}

export interface RoleService {
  // Role management
  createRole(roleData: CreateRoleRequest, createdBy: string): Promise<Role>;
  updateRole(roleId: string, roleData: UpdateRoleRequest, updatedBy: string): Promise<Role>;
  deleteRole(roleId: string, deletedBy: string): Promise<void>;
  getRole(roleId: string): Promise<Role>;
  getRoleByName(name: string): Promise<Role>;
  listRoles(): Promise<Role[]>;
  
  // User role management
  assignRole(assignmentData: AssignRoleRequest, assignedBy: string): Promise<RoleAssignmentResponse>;
  removeRole(userId: string, roleId: string, removedBy: string): Promise<void>;
  getUserRoles(userId: string): Promise<RoleAssignmentResponse[]>;
  
  // Permission checking
  getUserPermissions(userId: string): Promise<UserPermissionsResponse>;
  hasPermission(userId: string, permission: string): Promise<boolean>;
  hasAnyPermission(userId: string, permissions: string[]): Promise<boolean>;
  hasAllPermissions(userId: string, permissions: string[]): Promise<boolean>;
  
  // System initialization
  initializeSystemRoles(): Promise<void>;
  ensureUserHasDefaultRole(userId: string): Promise<void>;
}

// Middleware types
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
}

export interface RequirePermissionOptions {
  permission: string;
  resource?: string;
  allowSelf?: boolean; // Allow if user is accessing their own resource
}

export interface RequireRoleOptions {
  roles: string[];
  requireAll?: boolean; // Require all roles vs any role
}

// Error types
export class InsufficientPermissionsError extends Error {
  constructor(
    message: string,
    public requiredPermission: string,
    public userPermissions: string[]
  ) {
    super(message);
    this.name = 'InsufficientPermissionsError';
  }
}

export class RoleNotFoundError extends Error {
  constructor(message: string, public roleId?: string, public roleName?: string) {
    super(message);
    this.name = 'RoleNotFoundError';
  }
}

export class PermissionNotFoundError extends Error {
  constructor(message: string, public permissionName: string) {
    super(message);
    this.name = 'PermissionNotFoundError';
  }
}

export class RoleAssignmentError extends Error {
  constructor(message: string, public userId: string, public roleId: string) {
    super(message);
    this.name = 'RoleAssignmentError';
  }
}