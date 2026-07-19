// Shared admin-RBAC constants. Keep framework-free so both services and
// seed scripts can import without pulling NestJS providers.

export const SUPER_ADMIN_ROLE_CODE = 'SUPER_ADMIN';
export const ADMIN_PERMISSION_PREFIX = 'admin.';

// pg_advisory_lock bigint key used to serialize sole-SUPER_ADMIN mutations
// (deactivate). 64-bit hash of the constant string keeps it deterministic
// across deploys and stable across restarts.
export const SUPER_ADMIN_LOCK_KEY = 0x6e6f6d6f5f61646d; // hash64('nomo_admin_sa')
