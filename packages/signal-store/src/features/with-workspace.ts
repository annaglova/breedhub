import { createStoreFeature } from '../core/create-store-feature';
import type { Entity, StoreFeature } from '../types';

/**
 * Workspace types
 */
export type WorkspaceType = 'public' | 'private';

export interface WorkspaceState {
  workspaceType: WorkspaceType;
  workspaceId: string;
  permissions: {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
  metadata: {
    name: string;
    description?: string;
    owner?: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Feature for workspace management
 * Top-level store for public/private data separation
 */
export function withWorkspace(
  initialWorkspace: Partial<WorkspaceState> = {}
): StoreFeature<WorkspaceState, {
  setWorkspaceType: (type: WorkspaceType) => void;
  setPermissions: (permissions: Partial<WorkspaceState['permissions']>) => void;
  updateMetadata: (metadata: Partial<WorkspaceState['metadata']>) => void;
  switchWorkspace: (workspaceId: string, type: WorkspaceType) => void;
}> {
  return createStoreFeature({
    initialState: {
      workspaceType: 'public' as WorkspaceType,
      workspaceId: 'default',
      permissions: {
        canRead: true,
        canWrite: false,
        canDelete: false,
        canShare: false,
      },
      metadata: {
        name: 'Default Workspace',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ...initialWorkspace,
    },
    
    computed: {
      isPublic: (state) => state.workspaceType === 'public',
      isPrivate: (state) => state.workspaceType === 'private',
      canEdit: (state) => state.permissions.canWrite,
      workspaceName: (state) => state.metadata.name,
    },
    
    methods: (state, set) => ({
      setWorkspaceType: (type: WorkspaceType) => {
        set((draft) => {
          draft.workspaceType = type;
          // Reset permissions based on type
          if (type === 'public') {
            draft.permissions = {
              canRead: true,
              canWrite: false,
              canDelete: false,
              canShare: false,
            };
          }
          return draft;
        });
      },
      
      setPermissions: (permissions: Partial<WorkspaceState['permissions']>) => {
        set((draft) => {
          draft.permissions = { ...draft.permissions, ...permissions };
          return draft;
        });
      },
      
      updateMetadata: (metadata: Partial<WorkspaceState['metadata']>) => {
        set((draft) => {
          draft.metadata = { 
            ...draft.metadata, 
            ...metadata,
            updatedAt: new Date(),
          };
          return draft;
        });
      },
      
      switchWorkspace: (workspaceId: string, type: WorkspaceType) => {
        set((draft) => {
          draft.workspaceId = workspaceId;
          draft.workspaceType = type;
          draft.metadata.updatedAt = new Date();
          return draft;
        });
      },
    }),
  });
}