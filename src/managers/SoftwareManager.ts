import { appEvents, EventEmitter, Subscription } from '../utils/EventEmitter';
import type {
  Software,
  SoftwareQuery,
  SoftwareUpdatePayload,
  SoftwareEvent,
} from '../types/software';

export type SoftwareListener = (event: SoftwareEvent) => void;

export class SoftwareManager {
  private static instance: SoftwareManager;
  private softwareMap: Map<string, Software> = new Map();
  private eventEmitter = new EventEmitter();
  private storageKey = 'brewmate_software_db';
  private globalListenerCount = 0;

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): SoftwareManager {
    if (!SoftwareManager.instance) {
      SoftwareManager.instance = new SoftwareManager();
    }
    return SoftwareManager.instance;
  }

  // ─── CRUD Operations ────────────────────────────────────────────────────

  async getAll(): Promise<Software[]> {
    return Array.from(this.softwareMap.values());
  }

  async getById(id: string): Promise<Software | undefined> {
    return this.softwareMap.get(id);
  }

  async query(filters: SoftwareQuery = {}): Promise<Software[]> {
    const {
      keyword,
      category,
      tag,
      license,
      status,
      sortBy,
      sortOrder = 'asc',
      limit,
      offset,
    } = filters;

    const results: Software[] = [];
    const values = Array.from(this.softwareMap.values());
    const kw = keyword ? keyword.toLowerCase() : '';

    // Optimization: Single-pass for loop over values, replacing multiple chained .filter() allocations
    for (let i = 0; i < values.length; i++) {
      const s = values[i];

      // Keyword filter (matches name, description, tags)
      if (kw) {
        let match = false;
        if (s.name.toLowerCase().indexOf(kw) !== -1) {
          match = true;
        } else if (s.description.toLowerCase().indexOf(kw) !== -1) {
          match = true;
        } else {
          for (let j = 0; j < s.tags.length; j++) {
            if (s.tags[j].toLowerCase().indexOf(kw) !== -1) {
              match = true;
              break;
            }
          }
        }
        if (!match) continue;
      }

      // Category filter
      if (category && s.category !== category) continue;

      // Tag filter
      if (tag && s.tags.indexOf(tag) === -1) continue;

      // License filter
      if (license && s.license !== license) continue;

      // Status filter
      if (status && status !== 'all' && s.status !== status) continue;

      results.push(s);
    }

    // Sorting
    if (sortBy) {
      results.sort((a, b) => {
        let cmp: number;
        switch (sortBy) {
          case 'name':
            cmp = a.name.localeCompare(b.name);
            break;
          case 'version':
            cmp = a.version.localeCompare(b.version);
            break;
          case 'installedAt':
            cmp = a.installedAt - b.installedAt;
            break;
          case 'updatedAt':
            cmp = a.updatedAt - b.updatedAt;
            break;
          default:
            cmp = 0;
        }
        return sortOrder === 'desc' ? -cmp : cmp;
      });
    }

    // Pagination
    if (offset !== undefined) {
      results = results.slice(offset);
    }
    if (limit !== undefined) {
      results = results.slice(0, limit);
    }

    return results;
  }

  async add(software: Omit<Software, 'id' | 'installedAt' | 'updatedAt'>): Promise<Software> {
    const id = this.generateId();
    const now = Date.now();
    const record: Software = {
      ...software,
      id,
      installedAt: now,
      updatedAt: now,
      tags: software.tags || [],
      metadata: software.metadata || {},
    };

    this.softwareMap.set(id, record);
    await this.saveToStorage();
    this.emitEvent({ type: 'installed', software: record });
    return record;
  }

  async update(id: string, payload: SoftwareUpdatePayload): Promise<Software | null> {
    const existing = this.softwareMap.get(id);
    if (!existing) return null;

    const previousVersion = existing.version;
    const previousName = existing.name;
    const previousPath = existing.installPath;
    const previousTags = [...existing.tags];
    const previousMetadata = { ...(existing.metadata || {}) };

    const updated: Software = {
      ...existing,
      ...payload,
      updatedAt: Date.now(),
    };

    if (payload.tags !== undefined) {
      updated.tags = payload.tags;
    }
    if (payload.metadata !== undefined) {
      updated.metadata = { ...existing.metadata, ...payload.metadata };
    }

    this.softwareMap.set(id, updated);
    await this.saveToStorage();

    // Emit specific events based on what changed
    if (payload.name !== undefined && payload.name !== previousName) {
      this.emitEvent({ type: 'renamed', software: updated, previousName });
    }
    if (payload.installPath !== undefined && payload.installPath !== previousPath) {
      this.emitEvent({ type: 'moved', software: updated, previousPath });
    }
    if (payload.version !== undefined && payload.version !== previousVersion) {
      this.emitEvent({ type: 'updated', software: updated, previousVersion });
    }
    if (payload.tags !== undefined) {
      this.emitEvent({ type: 'tag_edit', software: updated, previousTags });
    }
    if (payload.metadata !== undefined) {
      this.emitEvent({ type: 'metadata_changed', software: updated, previousMetadata });
    }

    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const existing = this.softwareMap.get(id);
    if (!existing) return false;

    this.softwareMap.delete(id);
    await this.saveToStorage();
    this.emitEvent({ type: 'uninstalled', software: existing });
    return true;
  }

  async addTag(id: string, tag: string): Promise<Software | null> {
    const existing = this.softwareMap.get(id);
    if (!existing) return null;
    if (existing.tags.includes(tag)) return existing;

    const previousTags = [...existing.tags];
    existing.tags.push(tag);
    existing.updatedAt = Date.now();
    this.softwareMap.set(id, existing);
    await this.saveToStorage();
    this.emitEvent({ type: 'tag_edit', software: existing, previousTags });
    return existing;
  }

  async removeTag(id: string, tag: string): Promise<Software | null> {
    const existing = this.softwareMap.get(id);
    if (!existing) return null;

    const previousTags = [...existing.tags];
    const idx = existing.tags.indexOf(tag);
    if (idx === -1) return existing;

    existing.tags.splice(idx, 1);
    existing.updatedAt = Date.now();
    this.softwareMap.set(id, existing);
    await this.saveToStorage();
    this.emitEvent({ type: 'tag_edit', software: existing, previousTags });
    return existing;
  }

  async refreshStatus(id: string, newStatus: Software['status']): Promise<Software | null> {
    const existing = this.softwareMap.get(id);
    if (!existing) return null;
    if (existing.status === newStatus) return existing;

    const previousVersion = existing.version;
    existing.status = newStatus;
    existing.updatedAt = Date.now();
    this.softwareMap.set(id, existing);
    await this.saveToStorage();

    if (newStatus === 'installed') {
      this.emitEvent({ type: 'installed', software: existing });
    } else if (newStatus === 'not_installed') {
      this.emitEvent({ type: 'uninstalled', software: existing });
    } else if (newStatus === 'update_available') {
      this.emitEvent({ type: 'updated', software: existing, previousVersion });
    }

    return existing;
  }

  // ─── Event System ───────────────────────────────────────────────────────

  on(listener: SoftwareListener): Subscription {
    const subscription = this.eventEmitter.on('software:event', listener);
    this.updateGlobalListenerCount(1);
    const originalUnsubscribe = subscription.unsubscribe;
    subscription.unsubscribe = () => {
      this.updateGlobalListenerCount(-1);
      originalUnsubscribe();
    };
    return subscription;
  }

  once(listener: SoftwareListener): Subscription {
    const subscription = this.eventEmitter.once('software:event', listener);
    this.updateGlobalListenerCount(1);
    const originalUnsubscribe = subscription.unsubscribe;
    subscription.unsubscribe = () => {
      this.updateGlobalListenerCount(-1);
      originalUnsubscribe();
    };
    return subscription;
  }

  off(listener: SoftwareListener): void {
    this.eventEmitter.off('software:event', listener);
    this.updateGlobalListenerCount(-1);
  }

  waitFor(predicate: (event: SoftwareEvent) => boolean): Promise<SoftwareEvent> {
    return new Promise((resolve) => {
      const subscription = this.eventEmitter.on('software:event', (event) => {
        if (predicate(event)) {
          subscription.unsubscribe();
          resolve(event);
        }
      });
    });
  }

  private updateGlobalListenerCount(delta: number): void {
    this.globalListenerCount += delta;
    appEvents.emit('software:listener_count', this.globalListenerCount);
  }

  private emitEvent(event: SoftwareEvent): void {
    this.eventEmitter.emit('software:event', event);
    // Also emit on the global app events bus
    appEvents.emit('software:event', event);
  }

  // ─── Persistence ────────────────────────────────────────────────────────

  private async saveToStorage(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const data = JSON.stringify(Array.from(this.softwareMap.values()));
        await window.electronAPI.executeCommand(
          `mkdir -p ~/.brewmate && echo '${data.replace(/'/g, "'\\''")}' > ~/.brewmate/software.json`
        );
      }
    } catch (err) {
      console.warn('[SoftwareManager] Failed to persist to storage:', err);
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.executeCommand(
          'cat ~/.brewmate/software.json 2>/dev/null || echo ""'
        );
        if (result.stdout && result.stdout.trim()) {
          const data: Software[] = JSON.parse(result.stdout.trim());
          data.forEach((s) => this.softwareMap.set(s.id, s));
        }
      }
    } catch {
      // Ignore errors on initial load
    }
  }

  // ─── Utility ────────────────────────────────────────────────────────────

  private generateId(): string {
    return `sw_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Expose event bus for external consumers
  getAppEvents(): typeof appEvents {
    return appEvents;
  }
}
