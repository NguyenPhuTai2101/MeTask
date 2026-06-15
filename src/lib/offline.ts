import localforage from "localforage";

// Configure localforage database instances
localforage.config({
  name: "nexuspm_pwa",
  storeName: "offline_store",
});

export interface OfflineAction {
  id: string;
  type: string; // "TASK_UPDATE" | "TASK_CREATE" | "SUBTASK_TOGGLE" | "COMMENT_ADD"
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  body: any;
  timestamp: number;
}

// Check network status
export function isOnline(): boolean {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}

// 1. Caching static data snapshots
export async function setOfflineCache(key: string, data: any): Promise<any> {
  try {
    return await localforage.setItem(key, data);
  } catch (e) {
    console.error("Failed to set offline cache for:", key, e);
    return null;
  }
}

export async function getOfflineCache<T>(key: string): Promise<T | null> {
  try {
    return await localforage.getItem<T>(key);
  } catch (e) {
    console.error("Failed to get offline cache for:", key, e);
    return null;
  }
}

// 2. Offline Action Queue Management
export async function getOfflineQueue(): Promise<OfflineAction[]> {
  try {
    const queue = await localforage.getItem<OfflineAction[]>("action_queue");
    return queue || [];
  } catch (e) {
    console.error("Failed to read offline action queue", e);
    return [];
  }
}

export async function queueOfflineAction(
  type: string,
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: any
): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    const newAction: OfflineAction = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      url,
      method,
      body,
      timestamp: Date.now(),
    };
    queue.push(newAction);
    await localforage.setItem("action_queue", queue);
    console.log("Queued offline action:", newAction);
  } catch (e) {
    console.error("Failed to queue offline action", e);
  }
}

// 3. Syncing queue with server when online
export async function syncOfflineActions(onSyncProgress?: (msg: string) => void): Promise<boolean> {
  if (!isOnline()) return false;
  
  const queue = await getOfflineQueue();
  if (queue.length === 0) return true;

  console.log(`Starting synchronization of ${queue.length} offline actions...`);
  if (onSyncProgress) onSyncProgress(`Đang đồng bộ ${queue.length} tác vụ ngoại tuyến...`);

  // Sort queue by timestamp to ensure chronological order
  queue.sort((a, b) => a.timestamp - b.timestamp);

  const failedActions: OfflineAction[] = [];

  for (const action of queue) {
    try {
      if (onSyncProgress) onSyncProgress(`Đang gửi: ${action.type}...`);
      
      const res = await fetch(action.url, {
        method: action.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.body),
      });

      if (!res.ok) {
        console.error(`Action sync failed on server for action ${action.id}:`, res.statusText);
        failedActions.push(action);
      }
    } catch (e) {
      console.error(`Network error during syncing action ${action.id}:`, e);
      failedActions.push(action);
    }
  }

  // Update queue with only failed actions to retry later
  await localforage.setItem("action_queue", failedActions);
  
  if (failedActions.length === 0) {
    console.log("All offline actions synced successfully!");
    if (onSyncProgress) onSyncProgress("Đồng bộ hoàn thành!");
    return true;
  } else {
    console.warn(`${failedActions.length} actions failed to sync and will be retried.`);
    if (onSyncProgress) onSyncProgress(`Đồng bộ thất bại ${failedActions.length} tác vụ.`);
    return false;
  }
}
