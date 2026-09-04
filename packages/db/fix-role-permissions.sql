-- Drop and recreate role_permissions table to match schema
DROP TABLE IF EXISTS role_permissions CASCADE;

CREATE TABLE role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id),
  permission_id uuid NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);
