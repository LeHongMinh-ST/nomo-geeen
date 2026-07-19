-- PostgreSQL cannot remove enum values safely without table rewrite.
-- Down migration is intentionally a no-op. Reverse only if no audit_log rows
-- reference TENANT_UPDATE / TENANT_STATUS_CHANGE / TENANT_EXPORT.
-- Manual procedure (if ever required): create new enum without the three values,
-- alter column, drop old type, rename — only when zero rows use the values.
SELECT 1;
