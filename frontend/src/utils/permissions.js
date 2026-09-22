import { hasPermission } from '../permissions/access.js'

export const compileUserFeatures = (userPermissions) => {
  return {
    hasInventory: hasPermission(userPermissions, 'inventory.read'),
    hasPOS: hasPermission(userPermissions, 'sale.create'),
    hasKitchen: hasPermission(userPermissions, 'kitchen.read'),
  }
}
