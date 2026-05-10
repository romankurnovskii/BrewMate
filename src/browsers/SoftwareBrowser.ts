import { SoftwareManager } from '../managers/SoftwareManager';
import type {
  Software,
  SoftwareQuery,
  SoftwareUpdatePayload,
  SoftwareEvent,
} from '../types/software';

export { SoftwareQuery, SoftwareUpdatePayload, SoftwareEvent };

export class SoftwareBrowser {
  private manager: SoftwareManager;

  constructor(manager?: SoftwareManager) {
    this.manager = manager || SoftwareManager.getInstance();
  }

  // ─── Listing and Querying ───────────────────────────────────────────

  async listAll(): Promise<Software[]> {
    return this.manager.getAll();
  }

  async search(keyword: string): Promise<Software[]> {
    return this.manager.query({ keyword });
  }

  async findByCategory(category: string): Promise<Software[]> {
    return this.manager.query({ category });
  }

  async findByTag(tag: string): Promise<Software[]> {
    return this.manager.query({ tag });
  }

  async findByLicense(license: string): Promise<Software[]> {
    return this.manager.query({ license });
  }

  async findByStatus(
    status: 'installed' | 'not_installed' | 'update_available'
  ): Promise<Software[]> {
    return this.manager.query({ status });
  }

  async getById(id: string): Promise<Software | undefined> {
    return this.manager.getById(id);
  }

  // ─── Installation Lifecycle ─────────────────────────────────────────

  async install(name: string, version?: string): Promise<Software> {
    const existing = await this.manager.query({ keyword: name, status: 'installed' });
    if (existing.length > 0) {
      throw new Error(`Software "${name}" is already installed`);
    }

    return this.manager.add({
      name,
      version: version || 'latest',
      description: '',
      category: 'Other',
      tags: [],
      license: 'unknown',
      homepage: '',
      downloadUrl: '',
      installPath: `/usr/local/bin/${name}`,
      status: 'installed',
    });
  }

  async uninstall(id: string): Promise<boolean> {
    return this.manager.remove(id);
  }

  async update(id: string, payload: SoftwareUpdatePayload): Promise<Software | null> {
    return this.manager.update(id, payload);
  }

  // ─── Tag Management ─────────────────────────────────────────────────

  async addTag(id: string, tag: string): Promise<Software | null> {
    return this.manager.addTag(id, tag);
  }

  async removeTag(id: string, tag: string): Promise<Software | null> {
    return this.manager.removeTag(id, tag);
  }

  async setTags(id: string, tags: string[]): Promise<Software | null> {
    return this.manager.update(id, { tags });
  }

  // ─── Status Management ──────────────────────────────────────────────

  async markAsInstalled(id: string): Promise<Software | null> {
    return this.manager.refreshStatus(id, 'installed');
  }

  async markAsNotInstalled(id: string): Promise<Software | null> {
    return this.manager.refreshStatus(id, 'not_installed');
  }

  async markAsUpdateAvailable(id: string): Promise<Software | null> {
    return this.manager.refreshStatus(id, 'update_available');
  }

  // ─── Movement ───────────────────────────────────────────────────────

  async move(id: string, newPath: string): Promise<Software | null> {
    return this.manager.update(id, { installPath: newPath });
  }

  // ─── Metadata ───────────────────────────────────────────────────────

  async setMetadata(id: string, key: string, value: unknown): Promise<Software | null> {
    const existing = await this.manager.getById(id);
    if (!existing) return null;

    const updatedMetadata = { ...(existing.metadata || {}), [key]: value };
    return this.manager.update(id, { metadata: updatedMetadata });
  }

  // ─── Event Subscription ─────────────────────────────────────────────

  onEvent(listener: (event: SoftwareEvent) => void): () => void {
    const subscription = this.manager.on(listener);
    return subscription.unsubscribe;
  }

  onEventOnce(listener: (event: SoftwareEvent) => void): () => void {
    const subscription = this.manager.once(listener);
    return subscription.unsubscribe;
  }

  waitForEvent(predicate: (event: SoftwareEvent) => boolean): Promise<SoftwareEvent> {
    return this.manager.waitFor(predicate);
  }

  get appEvents() {
    return this.manager.getAppEvents();
  }
}
