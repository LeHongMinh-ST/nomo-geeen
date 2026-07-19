import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key cho PermissionGuard doc code theo PermissionGuard.canActivate().
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator gan metadata 'permissions' cho handler / controller.
 * PermissionGuard doc metadata nay de kiem tra req.user.permissions.
 *
 * AND semantics: tat ca codes truyen vao phai co trong user.permissions
 * (truu khi user.roleCodes chua 'SUPER_ADMIN' — guard short-circuit).
 *
 * Vi du:
 *   @RequirePermission('admin.user:view', 'admin.user:edit')
 *   async updateUser() { ... }
 */
export const RequirePermission = (
	...codes: string[]
): MethodDecorator & ClassDecorator => {
	return SetMetadata(PERMISSIONS_KEY, codes);
};