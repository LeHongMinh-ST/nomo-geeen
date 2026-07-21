-- R8.4: phone/email are optional contact fields and are not unique per tenant.
-- The earlier identity migration created partial unique indexes; remove them
-- without changing the user table or public API contract.
DROP INDEX IF EXISTS "user_tenantId_email_active_key";
DROP INDEX IF EXISTS "user_tenantId_phone_active_key";
