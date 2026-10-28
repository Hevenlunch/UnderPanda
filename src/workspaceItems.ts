export interface WorkspaceItem {
  id: string;
  title: string;
  image: string;
  subtitle: string;
  search?: string;
  category?: string;
  visible?: boolean;
}
export function filterWorkspaceItems<T extends WorkspaceItem>(items: T[], query: string, category: string) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(item => (!category || item.category === category)
    && words.every(word => `${item.title} ${item.subtitle} ${item.search ?? ""}`.toLocaleLowerCase().includes(word)));
}
export function reorderWorkspaceItems<T extends { id: string }>(items: T[], fromId: string, toId: string): T[] {
  const from = items.findIndex(item => item.id === fromId);
  const to = items.findIndex(item => item.id === toId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
