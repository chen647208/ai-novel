import type { StorageConfig } from '../../../shared/types';
import type { ImportExportMode, SettingsTab } from './types';

export const DEFAULT_SETTINGS_TAB: SettingsTab = 'models';
export const DEFAULT_IMPORT_EXPORT_MODE: ImportExportMode = 'export';

export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  dataPath: '',
  useCustomPath: false,
  lastMigration: undefined,
};
