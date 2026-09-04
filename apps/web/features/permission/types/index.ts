export type Permission = {
  id: string
  name: string
  createdAt: string
}

export type CreatePermissionInput = {
  name: string
}

export type UpdatePermissionInput = {
  name?: string
}
