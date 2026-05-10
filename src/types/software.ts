export interface Software {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  tags: string[];
  license: string;
  homepage: string;
  downloadUrl: string;
  installPath: string;
  installedAt: number;
  updatedAt: number;
  status: 'installed' | 'not_installed' | 'update_available';
  metadata?: Record<string, unknown>;
}

export interface SoftwareQuery {
  keyword?: string;
  category?: string;
  tag?: string;
  license?: string;
  status?: 'installed' | 'not_installed' | 'update_available' | 'all';
  sortBy?: 'name' | 'version' | 'installedAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SoftwareUpdatePayload {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  license?: string;
  homepage?: string;
  downloadUrl?: string;
  installPath?: string;
  version?: string;
  status?: 'installed' | 'not_installed' | 'update_available';
  metadata?: Record<string, unknown>;
}

export type SoftwareEvent =
  | { type: 'installed'; software: Software }
  | { type: 'updated'; software: Software; previousVersion: string }
  | { type: 'uninstalled'; software: Software }
  | { type: 'renamed'; software: Software; previousName: string }
  | { type: 'moved'; software: Software; previousPath: string }
  | { type: 'tag_edit'; software: Software; previousTags: string[] }
  | { type: 'metadata_changed'; software: Software; previousMetadata: Record<string, unknown> }
  | { type: 'listener_count'; count: number };
