/**
 * Sync queue manager for serializing GitHub API operations
 */

import type { SyncQueueItem, SyncOperation } from '@natatki/shared';
import { SyncQueueStatus } from '@natatki/shared';

export class SyncQueue {
  private queue: Map<string, SyncQueueItem> = new Map();
  private processing: Set<string> = new Set();
  private maxRetries = 3;

  /**
   * Add an item to the sync queue
   */
  enqueue(
    operation: SyncOperation,
    path: string,
    payload: unknown,
    noteId?: string
  ): string {
    const id = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const item: SyncQueueItem = {
      id,
      operation,
      noteId,
      path,
      payload,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      status: SyncQueueStatus.PENDING
    };

    this.queue.set(id, item);
    return id;
  }

  /**
   * Get next pending item
   */
  getNext(): SyncQueueItem | null {
    for (const item of this.queue.values()) {
      if (item.status === SyncQueueStatus.PENDING && !this.processing.has(item.id)) {
        return item;
      }
    }
    return null;
  }

  /**
   * Mark item as processing
   */
  markProcessing(id: string): void {
    const item = this.queue.get(id);
    if (item) {
      item.status = SyncQueueStatus.PROCESSING;
      item.lastAttemptAt = new Date().toISOString();
      this.processing.add(id);
    }
  }

  /**
   * Mark item as completed
   */
  markCompleted(id: string): void {
    const item = this.queue.get(id);
    if (item) {
      item.status = SyncQueueStatus.COMPLETED;
      this.processing.delete(id);
      // Keep in queue for a short time, then remove
      setTimeout(() => this.queue.delete(id), 60000);
    }
  }

  /**
   * Mark item as failed
   */
  markFailed(id: string, error: string): void {
    const item = this.queue.get(id);
    if (item) {
      item.retryCount++;
      item.error = error;
      
      if (item.retryCount >= this.maxRetries) {
        item.status = SyncQueueStatus.FAILED;
        this.processing.delete(id);
      } else {
        item.status = SyncQueueStatus.RETRYING;
        this.processing.delete(id);
        // Will be retried on next processing cycle
      }
    }
  }

  /**
   * Get queue status
   */
  getStatus(): { pending: number; processing: number; failed: number } {
    let pending = 0;
    let processing = 0;
    let failed = 0;

    for (const item of this.queue.values()) {
      if (item.status === SyncQueueStatus.PENDING || item.status === SyncQueueStatus.RETRYING) {
        pending++;
      } else if (item.status === SyncQueueStatus.PROCESSING) {
        processing++;
      } else if (item.status === SyncQueueStatus.FAILED) {
        failed++;
      }
    }

    return { pending, processing, failed };
  }

  /**
   * Get all items
   */
  getAll(): SyncQueueItem[] {
    return Array.from(this.queue.values());
  }

  /**
   * Clear completed items
   */
  clearCompleted(): void {
    for (const [id, item] of this.queue.entries()) {
      if (item.status === SyncQueueStatus.COMPLETED) {
        this.queue.delete(id);
      }
    }
  }
}

