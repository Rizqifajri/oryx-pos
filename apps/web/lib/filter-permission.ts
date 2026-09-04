export function filterPermission<T>(
  items: T[],
  predicate: (item: T) => boolean,
): T[] {
  return items.filter(predicate)
}
