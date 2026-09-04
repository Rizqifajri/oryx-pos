# API Documentation

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

All endpoints (except auth and public order endpoints) require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "code": 400
}
```

---

## Authentication

### Register

Create a new tenant and admin account. Automatically creates a tenant-scoped Admin role with all non-global permissions.

**Endpoint:** `POST /auth/register`

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "tenantName": "My Restaurant"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "tenantId": "uuid"
  },
  "message": "Registration successful"
}
```

---

### Login

Authenticate and receive access + refresh tokens.

**Endpoint:** `POST /auth/login`

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

---

### Refresh Token

Get a new access token and rotated refresh token. The previous refresh token is invalidated after use.

**Endpoint:** `POST /auth/refresh`

**Request Body:**

```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

> **Note:** Refresh tokens are rotated on every use. Store the new refresh token and discard the old one. Revoked or previously used tokens return `401`.

---

### Logout

Invalidate the current refresh token server-side.

**Endpoint:** `POST /auth/logout`

**Auth:** Required (Bearer token)

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Tenants

### List All Tenants

**Endpoint:** `GET /tenants` — **Auth:** GLOBAL scope required

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "My Restaurant",
      "slug": "my-restaurant",
      "createdAt": "2024-01-01"
    }
  ]
}
```

### Get My Tenant

**Endpoint:** `GET /tenants/me` — **Auth:** Required (both scopes)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Restaurant",
    "slug": "my-restaurant",
    "createdAt": "2024-01-01"
  }
}
```

### Get Tenant by ID

**Endpoint:** `GET /tenants/:id` — **Auth:** GLOBAL scope required

### Create Tenant

**Endpoint:** `POST /tenants` — **Auth:** GLOBAL scope required

**Request Body:**

```json
{
  "name": "New Restaurant",
  "slug": "new-restaurant"
}
```

**Response:** `201 Created`

### Update My Tenant

**Endpoint:** `PATCH /tenants/me` — **Auth:** Required (both scopes) | **Permission:** `tenant:manage`

**Request Body:**

```json
{
  "name": "Updated Restaurant Name",
  "slug": "updated-slug"
}
```

### Update Tenant by ID

**Endpoint:** `PATCH /tenants/:id` — **Auth:** GLOBAL scope required

### Delete My Tenant

**Endpoint:** `DELETE /tenants/me` — **Auth:** Required (both scopes) | **Permission:** `tenant:manage`

### Delete Tenant by ID

**Endpoint:** `DELETE /tenants/:id` — **Auth:** GLOBAL scope required

---

## Users

### List Users

**Endpoint:** `GET /users` — GLOBAL: all users, TENANT: own tenant only

**Auth:** Required (both scopes)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "roleId": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01"
    }
  ]
}
```

> **Note:** `password` and `refreshToken` fields are never returned in any user response.

### Get Users by Tenant

**Endpoint:** `GET /users/tenant/:tenantId` — **Auth:** Required | TENANT users can only access their own tenant

### Get User by ID

**Endpoint:** `GET /users/:id` — **Auth:** Required | TENANT users can only access users in their tenant

### Create User

**Endpoint:** `POST /users` — **Auth:** Required | **Permission:** `user:manage` (TENANT), `user:create` (GLOBAL)

**Request Body:**

```json
{
  "tenantId": "uuid",
  "roleId": "uuid",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePass123"
}
```

> **Constraint:** TENANT users can only assign roles that belong to their own tenant.

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "roleId": "uuid",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "createdAt": "2024-01-01"
  }
}
```

### Update User

**Endpoint:** `PATCH /users/:id` — **Auth:** Required | **Permission:** `user:manage` (TENANT)

**Request Body:**

```json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "roleId": "uuid",
  "password": "NewPassword123"
}
```

> **Constraint:** `roleId` must belong to the same tenant as the user being updated.

### Delete User

**Endpoint:** `DELETE /users/:id` — **Auth:** Required | **Permission:** `user:manage` (TENANT)

---

## Roles

### List Roles

**Endpoint:** `GET /roles` — GLOBAL: all roles, TENANT: own tenant only

**Auth:** Required (both scopes)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "Manager",
      "scope": "TENANT",
      "createdAt": "2024-01-01"
    }
  ]
}
```

### Get Roles by Tenant

**Endpoint:** `GET /roles/tenant/:tenantId` — **Auth:** Required

### Get Role by ID

**Endpoint:** `GET /roles/:id` — **Auth:** Required | Returns role with its permissions list

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "Manager",
    "scope": "TENANT",
    "createdAt": "2024-01-01",
    "permissions": [
      { "id": "uuid", "name": "order:read" }
    ]
  }
}
```

### Create Role

**Endpoint:** `POST /roles` — **Auth:** Required | **Permission:** `role:manage` (TENANT)

**Request Body:**

```json
{
  "tenantId": "uuid",
  "name": "Manager",
  "scope": "TENANT",
  "permissionIds": ["uuid1", "uuid2"]
}
```

**Constraints:**
- TENANT users cannot set `scope: "GLOBAL"`
- TENANT users cannot assign global-only permissions (`tenant:*`, `permission:view/create/update/delete/manage`)

**Response:** `201 Created`

### Update Role

**Endpoint:** `PATCH /roles/:id` — **Auth:** Required | **Permission:** `role:manage` (TENANT)

**Request Body:**

```json
{
  "name": "Senior Manager",
  "permissionIds": ["uuid1", "uuid2", "uuid3"]
}
```

> Providing `permissionIds` **replaces** the full permission set (sync, not append).

### Delete Role

**Endpoint:** `DELETE /roles/:id` — **Auth:** Required | **Permission:** `role:manage` (TENANT)

---

## Permissions

### List Permissions

**Endpoint:** `GET /permissions` — **Auth:** Required (both scopes)

> **Note:** TENANT users can list all permissions in the system (needed for role management UI). However, they cannot assign global-only permissions (`tenant:*`, `permission:view/create/update/delete/manage`) to TENANT-scoped roles - this is enforced server-side during role creation/update.

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "menu:create",
      "createdAt": "2024-01-01"
    }
  ]
}
```

### Get Permission by ID

**Endpoint:** `GET /permissions/:id` — **Auth:** Required | TENANT users cannot access global-only permissions

### Create Permission

**Endpoint:** `POST /permissions` — **Auth:** GLOBAL scope required

```json
{ "name": "custom:permission" }
```

### Update Permission

**Endpoint:** `PATCH /permissions/:id` — **Auth:** GLOBAL scope required

### Delete Permission

**Endpoint:** `DELETE /permissions/:id` — **Auth:** GLOBAL scope required

---

## Categories

### List Categories

**Endpoint:** `GET /categories` — GLOBAL: all, TENANT: own tenant only

**Auth:** Required | **Permission:** `category:list`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "Appetizers",
      "createdAt": "2024-01-01"
    }
  ]
}
```

### Get Categories by Tenant

**Endpoint:** `GET /categories/tenant/:tenantId` — **Auth:** Required

### Get Category by ID

**Endpoint:** `GET /categories/:id` — **Auth:** Required

### Create Category

**Endpoint:** `POST /categories` — **Auth:** Required | **Permission:** `category:create`

```json
{
  "tenantId": "uuid",
  "name": "Appetizers"
}
```

**Response:** `201 Created`

### Update Category

**Endpoint:** `PATCH /categories/:id` — **Auth:** Required | **Permission:** `category:update`

```json
{ "name": "Starters" }
```

### Delete Category

**Endpoint:** `DELETE /categories/:id` — **Auth:** Required | **Permission:** `category:delete`

---

## Menus

### List Menus

**Endpoint:** `GET /menus` — GLOBAL: all, TENANT: own tenant only

**Auth:** Required | **Permission:** `menu:list`

**Query Parameters:**

- `categoryId` (optional) — filter by category UUID
- `isAvailable` (optional) — `true` or `false`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "categoryId": "uuid",
      "name": "Caesar Salad",
      "description": "Fresh romaine lettuce with parmesan",
      "price": 1200,
      "imageUrl": "https://example.com/salad.jpg",
      "isAvailable": true,
      "createdAt": "2024-01-01"
    }
  ]
}
```

### Get Menus by Tenant

**Endpoint:** `GET /menus/tenant/:tenantId` — **Auth:** Required

### Get Menus by Category

**Endpoint:** `GET /menus/category/:categoryId` — **Auth:** Required

### Get Menu by ID

**Endpoint:** `GET /menus/:id` — **Auth:** Required

### Create Menu

**Endpoint:** `POST /menus` — **Auth:** Required | **Permission:** `menu:create`

```json
{
  "tenantId": "uuid",
  "categoryId": "uuid",
  "name": "Caesar Salad",
  "description": "Fresh romaine lettuce with parmesan cheese and croutons",
  "price": 1200,
  "imageUrl": "https://example.com/salad.jpg",
  "isAvailable": true
}
```

**Validation:**
- `name`: 2–100 characters
- `description`: max 500 characters
- `price`: positive integer (store in smallest currency unit, e.g. cents)
- `imageUrl`: valid URL
- `categoryId`: must exist and belong to the same tenant

**Response:** `201 Created`

### Update Menu

**Endpoint:** `PATCH /menus/:id` — **Auth:** Required | **Permission:** `menu:update`

All fields optional. If `categoryId` is provided it must belong to the same tenant as the menu.

### Toggle Menu Availability

**Endpoint:** `PATCH /menus/:id/availability` — **Auth:** Required | **Permission:** `menu:update`

```json
{ "isAvailable": false }
```

### Bulk Update Menu Availability

**Endpoint:** `PATCH /menus/bulk/availability` — **Auth:** Required | **Permission:** `menu:update`

```json
{
  "menuIds": ["uuid1", "uuid2", "uuid3"],
  "isAvailable": false
}
```

> TENANT users: all menu IDs must belong to their tenant.

### Delete Menu

**Endpoint:** `DELETE /menus/:id` — **Auth:** Required | **Permission:** `menu:delete`

---

## Tables

### List Tables

**Endpoint:** `GET /tables` — GLOBAL: all, TENANT: own tenant only

**Auth:** Required | **Permission:** `table:list`

**Query Parameters:**

- `status` (optional) — `AVAILABLE` or `OCCUPIED`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "Table 1",
      "capacity": 4,
      "status": "AVAILABLE",
      "createdAt": "2024-01-01"
    }
  ]
}
```

### Get Tables by Tenant

**Endpoint:** `GET /tables/tenant/:tenantId` — **Auth:** Required

### Get Table by ID

**Endpoint:** `GET /tables/:id` — **Auth:** Required

### Create Table

**Endpoint:** `POST /tables` — **Auth:** Required | **Permission:** `table:create`

```json
{
  "tenantId": "uuid",
  "name": "Table 1",
  "capacity": 4,
  "status": "AVAILABLE"
}
```

**Response:** `201 Created`

### Update Table

**Endpoint:** `PATCH /tables/:id` — **Auth:** Required | **Permission:** `table:update`

### Update Table Status

**Endpoint:** `PATCH /tables/:id/status` — **Auth:** Required | **Permission:** `table:update`

```json
{ "status": "OCCUPIED" }
```

### Delete Table

**Endpoint:** `DELETE /tables/:id` — **Auth:** Required | **Permission:** `table:delete`

> **Constraint:** Returns `400` if the table has any active orders (`NEW` or `PROCESSING` status). Resolve or cancel those orders first.

---

## Customers

### List Customers

**Endpoint:** `GET /customers` — GLOBAL: all, TENANT: own tenant only

**Auth:** Required | **Permission:** `customer:list`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "John Doe",
      "phone": "081234567890",
      "email": "john@example.com",
      "createdAt": "2024-01-01"
    }
  ]
}
```

### Get Customers by Tenant

**Endpoint:** `GET /customers/tenant/:tenantId` — **Auth:** Required

### Get Customer by ID

**Endpoint:** `GET /customers/:id` — **Auth:** Required

### Create Customer

**Endpoint:** `POST /customers` — **Auth:** Required | **Permission:** `customer:create`

```json
{
  "tenantId": "uuid",
  "name": "John Doe",
  "phone": "081234567890",
  "email": "john@example.com"
}
```

**Response:** `201 Created`

### Update Customer

**Endpoint:** `PATCH /customers/:id` — **Auth:** Required | **Permission:** `customer:update`

```json
{ "name": "Jane Doe", "phone": "087654321" }
```

### Delete Customer

**Endpoint:** `DELETE /customers/:id` — **Auth:** Required | **Permission:** `customer:delete`

---

## Orders

### List Orders (Staff)

**Endpoint:** `GET /orders` — GLOBAL: all, TENANT: own tenant only

**Auth:** Required | **Permission:** `order:list`

**Query Parameters:**

- `status` — `NEW` | `PROCESSING` | `COMPLETED` | `CANCELED`
- `tableId` — filter by specific table UUID

**Response:** `200 OK` — includes order items

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "tableId": "uuid",
      "customerId": "uuid",
      "status": "NEW",
      "totalPrice": 85000,
      "createdAt": "2024-01-01",
      "items": [
        {
          "id": "uuid",
          "orderId": "uuid",
          "menuId": "uuid",
          "menuName": "Nasi Goreng",
          "quantity": 2,
          "price": 35000
        }
      ]
    }
  ]
}
```

### Get Order by ID (Staff)

**Endpoint:** `GET /orders/:id` — **Auth:** Required | **Permission:** `order:list`

Response shape is identical to the list item above.

### Create Order (Staff)

**Endpoint:** `POST /orders` — **Auth:** Required | **Permission:** `order:create`

`totalPrice` is **auto-calculated** server-side from menu prices.

```json
{
  "tenantId": "uuid",
  "tableId": "uuid",
  "customerId": "uuid (optional)",
  "items": [
    { "menuId": "uuid", "quantity": 2 }
  ]
}
```

**Constraints:**
- Table must be `AVAILABLE` — returns `409` if already `OCCUPIED`
- Table, customer, and all menu items must belong to the same tenant
- All menu items must have `isAvailable: true`

**Response:** `201 Created` — returns created order including items

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "tableId": "uuid",
    "customerId": null,
    "status": "NEW",
    "totalPrice": 85000,
    "createdAt": "2024-01-01",
    "items": [
      {
        "id": "uuid",
        "orderId": "uuid",
        "menuId": "uuid",
        "menuName": "Nasi Goreng",
        "quantity": 2,
        "price": 35000
      }
    ]
  }
}
```

> Creates the order and sets table status to `OCCUPIED`.

### Update Order Status

**Endpoint:** `PATCH /orders/:id/status` — **Auth:** Required | **Permission:** `order:update`

**State machine:**

```
NEW → PROCESSING → COMPLETED
NEW → CANCELED
PROCESSING → CANCELED
```

```json
{ "status": "PROCESSING" }
```

> **Table behavior:** Table is freed to `AVAILABLE` only on `CANCELED`. On `COMPLETED`, the table remains `OCCUPIED` until payment is recorded via `POST /transactions`.

### Delete Order (Staff)

**Endpoint:** `DELETE /orders/:id` — **Auth:** Required | **Permission:** `order:cancel`

> Only `NEW` orders can be deleted. Deleting frees the table back to `AVAILABLE`.

---

### Get Public Menu (Customer QR)

**Endpoint:** `GET /orders/public/menu?tableId=xxx` — **No auth required**

Returns available menu items and their categories for the table's tenant. Only categories with at least one available menu item are included.

```json
{
  "success": true,
  "data": {
    "table": { "id": "uuid", "name": "Table 1", "capacity": 4 },
    "categories": [
      { "id": "uuid", "tenantId": "uuid", "name": "Appetizers", "createdAt": "2024-01-01" }
    ],
    "menus": [
      {
        "id": "uuid",
        "tenantId": "uuid",
        "categoryId": "uuid",
        "name": "Nasi Goreng",
        "description": "Fried rice",
        "price": 35000,
        "imageUrl": "https://example.com/nasi-goreng.jpg",
        "isAvailable": true,
        "createdAt": "2024-01-01"
      }
    ]
  }
}
```

### Place Order (Customer QR Self-Service)

**Endpoint:** `POST /orders/public` — **No auth required**

Customer scans a QR code containing `tableId` and submits this payload. `tenantId` is derived server-side from the table.

```json
{
  "tableId": "uuid",
  "items": [{ "menuId": "uuid", "quantity": 2 }],
  "customerName": "John Doe (optional)",
  "customerPhone": "081234567890 (optional)",
  "customerEmail": "john@example.com (optional)"
}
```

**Constraints:**
- Table must be `AVAILABLE` — returns `409` if already `OCCUPIED`
- If `customerPhone` is provided and matches an existing customer in this tenant, that record is reused (no duplicate created)

**Response:** `201 Created` — creates order + optionally upserts customer, sets table to `OCCUPIED`

---

## Transactions

### List Transactions

**Endpoint:** `GET /transactions` — GLOBAL: all, TENANT: own tenant only

**Auth:** Required | **Permission:** `transaction:list`

### Get Transaction by Order

**Endpoint:** `GET /transactions/order/:orderId` — **Auth:** Required

### Get Transaction by ID

**Endpoint:** `GET /transactions/:id` — **Auth:** Required

### Create Transaction (Payment)

**Endpoint:** `POST /transactions` — **Auth:** Required | **Permission:** `transaction:create`

Records a payment for a completed order.

```json
{ "orderId": "uuid", "paymentMethod": "cash" }
```

**Constraints:**
- Order must have status `COMPLETED`
- Only one transaction per order — duplicate returns `409`
- `totalAmount` is taken from `order.totalPrice` (not from request body)
- After creating, sets table status back to `AVAILABLE`

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "orderId": "uuid",
    "totalAmount": 85000,
    "paymentMethod": "cash",
    "createdAt": "2024-01-01"
  }
}
```

### Delete Transaction

**Endpoint:** `DELETE /transactions/:id` — **Auth:** Required | **Permission:** `transaction:delete`

---

## Complete Order Flow

### Staff-Managed Flow

```
1. Create order          POST /orders
   → table: AVAILABLE → OCCUPIED

2. Start preparing       PATCH /orders/:id/status  { "status": "PROCESSING" }

3. Mark food served      PATCH /orders/:id/status  { "status": "COMPLETED" }
   → table stays OCCUPIED (customer still at table, bill not paid)

4. Record payment        POST /transactions  { "orderId": "...", "paymentMethod": "cash" }
   → table: OCCUPIED → AVAILABLE
```

### Cancel Flow

```
PATCH /orders/:id/status  { "status": "CANCELED" }
→ table: OCCUPIED → AVAILABLE immediately (no transaction needed)

DELETE /orders/:id  (NEW orders only)
→ table: OCCUPIED → AVAILABLE immediately
```

### Customer Self-Service Flow (QR Code)

```
1. Customer scans QR code (encodes tableId)
2. Fetch menu             GET /orders/public/menu?tableId=xxx
3. Place order            POST /orders/public
   → table: AVAILABLE → OCCUPIED
4. Staff handles the rest via staff flow above
```

---

## Error Codes

| Code | Description                                      |
|------|--------------------------------------------------|
| 200  | Success                                          |
| 201  | Created                                          |
| 400  | Bad Request — invalid input or business rule     |
| 401  | Unauthorized — missing, invalid, or revoked token|
| 403  | Forbidden — insufficient scope or permission     |
| 404  | Not Found                                        |
| 409  | Conflict — duplicate resource or occupied table  |
| 500  | Internal Server Error                            |

---

## Scope-Based Access

### GLOBAL Scope

- Access all resources across all tenants
- Can create both `GLOBAL` and `TENANT` scoped roles
- Can create, update, and delete permissions
- Bypasses all permission checks

### TENANT Scope

- All queries automatically filtered to own `tenantId`
- Can only create `TENANT`-scoped roles
- Can list all permissions via `GET /permissions` (needed when creating/editing roles)
- Can only assign non-global permissions to roles (global-only: `tenant:*`, `permission:view/create/update/delete/manage`)
- Cannot access other tenants' data

---

## Common Use Cases

### Restaurant Owner Setup

```bash
# 1. Register
POST /auth/register
{ "name": "John Doe", "email": "john@restaurant.com", "password": "SecurePass123", "tenantName": "My Restaurant" }

# 2. Login
POST /auth/login
{ "email": "john@restaurant.com", "password": "SecurePass123" }

# 3. Create categories
POST /categories
{ "tenantId": "<tenant-id>", "name": "Appetizers" }

# 4. Create menu items
POST /menus
{ "tenantId": "<tenant-id>", "categoryId": "<category-id>", "name": "Caesar Salad",
  "description": "Fresh salad", "price": 1200, "imageUrl": "https://...", "isAvailable": true }

# 5. Create a staff role
POST /roles
{ "tenantId": "<tenant-id>", "name": "Waiter", "scope": "TENANT", "permissionIds": ["<perm-id>"] }

# 6. Add a staff user
POST /users
{ "tenantId": "<tenant-id>", "roleId": "<waiter-role-id>", "name": "Jane Smith",
  "email": "jane@restaurant.com", "password": "SecurePass456" }
```

### Daily Operations

```bash
# Toggle menu sold out
PATCH /menus/<menu-id>/availability
{ "isAvailable": false }

# Bulk disable breakfast items
PATCH /menus/bulk/availability
{ "menuIds": ["id1", "id2"], "isAvailable": false }

# View active orders for a table
GET /orders?tableId=<table-id>&status=NEW

# Logout
POST /auth/logout
```

---

## Notes

- **Prices** are stored as integers in the smallest currency unit (e.g. IDR cents, or just IDR without decimals — your choice, keep it consistent).
- **Pagination** is not implemented. All list endpoints return all matching records.
- **Rate limiting** is not implemented. Consider adding in production.
- **CORS** is configured via the `CORS_ORIGIN` environment variable. Allowed methods: `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`.
