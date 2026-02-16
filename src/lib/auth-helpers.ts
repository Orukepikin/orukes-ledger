import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { authOptions } from './auth';
import prisma from './prisma';

export type Permission = 
  | 'view:transactions'
  | 'create:transactions'
  | 'edit:transactions'
  | 'delete:transactions'
  | 'approve:transactions'
  | 'view:reports'
  | 'export:reports'
  | 'view:budgets'
  | 'manage:budgets'
  | 'view:categories'
  | 'manage:categories'
  | 'view:accounts'
  | 'manage:accounts'
  | 'view:members'
  | 'manage:members'
  | 'manage:settings'
  | 'manage:billing';

const rolePermissions: Record<Role, Permission[]> = {
  OWNER: [
    'view:transactions', 'create:transactions', 'edit:transactions', 'delete:transactions', 'approve:transactions',
    'view:reports', 'export:reports',
    'view:budgets', 'manage:budgets',
    'view:categories', 'manage:categories',
    'view:accounts', 'manage:accounts',
    'view:members', 'manage:members',
    'manage:settings', 'manage:billing',
  ],
  ADMIN: [
    'view:transactions', 'create:transactions', 'edit:transactions', 'delete:transactions', 'approve:transactions',
    'view:reports', 'export:reports',
    'view:budgets', 'manage:budgets',
    'view:categories', 'manage:categories',
    'view:accounts', 'manage:accounts',
    'view:members', 'manage:members',
    'manage:settings',
  ],
  STAFF: [
    'view:transactions', 'create:transactions', 'edit:transactions',
    'view:reports',
    'view:budgets',
    'view:categories',
    'view:accounts',
    'view:members',
  ],
  VIEWER: [
    'view:transactions',
    'view:reports',
    'view:budgets',
    'view:categories',
    'view:accounts',
    'view:members',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  
  if (!session?.user?.id) {
    redirect('/auth/login');
  }
  
  return session;
}

export async function getUserMemberships(userId: string) {
  return prisma.businessMember.findMany({
    where: { userId },
    include: {
      business: {
        include: {
          subscription: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getBusinessMembership(userId: string, businessId: string) {
  return prisma.businessMember.findUnique({
    where: {
      userId_businessId: { userId, businessId },
    },
    include: {
      business: {
        include: {
          subscription: true,
        },
      },
    },
  });
}

export async function requireBusinessAccess(businessId: string, requiredPermission?: Permission) {
  const session = await requireAuth();
  
  const membership = await getBusinessMembership(session.user.id, businessId);
  
  if (!membership) {
    throw new Error('Access denied: Not a member of this business');
  }
  
  if (requiredPermission && !hasPermission(membership.role, requiredPermission)) {
    throw new Error(`Access denied: Missing permission ${requiredPermission}`);
  }
  
  return {
    session,
    membership,
    business: membership.business,
    role: membership.role,
  };
}

// Middleware helper for API routes
export async function withBusinessAuth(
  businessId: string,
  requiredPermission?: Permission
) {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 };
  }
  
  const membership = await getBusinessMembership(session.user.id, businessId);
  
  if (!membership) {
    return { error: 'Access denied', status: 403 };
  }
  
  if (requiredPermission && !hasPermission(membership.role, requiredPermission)) {
    return { error: 'Insufficient permissions', status: 403 };
  }
  
  return {
    session,
    membership,
    business: membership.business,
    userId: session.user.id,
    businessId,
    role: membership.role,
  };
}

// Create audit log entry
export async function createAuditLog(
  businessId: string,
  userId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT',
  entityType: string,
  entityId: string,
  oldData?: unknown,
  newData?: unknown
) {
  return prisma.auditLog.create({
    data: {
      businessId,
      userId,
      action,
      entityType,
      entityId,
      oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : undefined,
      newData: newData ? JSON.parse(JSON.stringify(newData)) : undefined,
    },
  });
}

// Get current business from cookies/session
export async function getCurrentBusiness(userId: string) {
  // Get user's first business or most recently accessed
  const membership = await prisma.businessMember.findFirst({
    where: { userId },
    include: {
      business: {
        include: {
          subscription: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  
  return membership?.business ?? null;
}
