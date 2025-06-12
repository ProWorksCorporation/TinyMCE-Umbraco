import { manifests as entityActions } from './entity-actions/manifests.js';
import { manifests as workspaceViews } from './workspace-views/manifests.js';

export const manifests: Array<UmbExtensionManifest> = [...entityActions, ...workspaceViews];
