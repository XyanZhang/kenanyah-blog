WITH admin_input AS (
  SELECT
    'kenanyah@admin.com'::text AS email,
    'kenanyah'::text AS name,
    '$2b$10$3V5VD1wEo7jKKbOg3Ce.FeTYX4OU4tmjjWRnUf.Xs01XTKnJzNnh.'::text AS password_hash
)
INSERT INTO "admin_users" (
  "id",
  "email",
  "passwordHash",
  "name",
  "role",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'admin_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'),
  admin_input.email,
  admin_input.password_hash,
  admin_input.name,
  'ADMIN',
  true,
  NOW(),
  NOW()
FROM admin_input
ON CONFLICT ("email") DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "name" = EXCLUDED."name",
  "role" = 'ADMIN',
  "isActive" = true,
  "updatedAt" = NOW();
