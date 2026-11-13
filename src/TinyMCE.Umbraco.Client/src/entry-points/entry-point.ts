import {
	disableBlobDownloadWorkaround,
	enableBlobDownloadWorkaround,
} from './blob-download-router-fix.js';
import type { UmbEntryPointOnInit, UmbEntryPointOnUnload } from '@umbraco-cms/backoffice/extension-api';

export const onInit: UmbEntryPointOnInit = (_host, _extensionRegistry) => {
	// Let blob:/data: downloads (e.g. TinyMCE's PDF export) through Umbraco's router.
	// See blob-download-router-fix.ts for why this is needed.
	enableBlobDownloadWorkaround();

	// API client authentication is session-scoped and lives in user-entry-point.ts.
};

export const onUnload: UmbEntryPointOnUnload = (_host, _extensionRegistry) => {
	disableBlobDownloadWorkaround();
};
