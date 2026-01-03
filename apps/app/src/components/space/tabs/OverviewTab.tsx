import React from 'react';
import { Dog, Building, Heart } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Badge } from '@ui/components/badge';

interface OverviewTabProps {
  entity: any;
  mode?: 'drawer' | 'fullscreen' | 'tab-fullscreen';
  recordsLimit?: number;
  onExpand?: () => void;
}

/**
 * Overview Tab - General information about entity
 *
 * Adaptive content based on mode:
 * - drawer/fullscreen: Preview with recordsLimit
 * - tab-fullscreen: Full data with pagination
 */
export function OverviewTab({
  entity,
  mode = 'drawer',
  recordsLimit = 10,
  onExpand
}: OverviewTabProps) {

  const isPreview = mode !== 'tab-fullscreen';

  return (
    <div>
      {/* Main image - only in preview modes */}
      {isPreview && entity.avatar_url && (
        <div className="w-full h-64 bg-slate-100">
          <img
            src={entity.avatar_url}
            alt={entity.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Title and origin */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {entity.name || 'Unknown'}
          </h1>
          <p className="text-slate-600 mt-1">
            {entity.authentic_name || entity.admin_name || ''}
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4">
          {entity.pet_profile_count !== undefined && (
            <div className="flex items-center gap-2">
              <Dog className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-600">Pets</p>
                <p className="font-semibold">{entity.pet_profile_count}</p>
              </div>
            </div>
          )}
          {entity.kennel_count !== undefined && (
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-600">Kennels</p>
                <p className="font-semibold">{entity.kennel_count}</p>
              </div>
            </div>
          )}
        </div>

        {/* Characteristics */}
        <div>
          <h3 className="font-semibold text-slate-900 mb-3">Characteristics</h3>
          <div className="space-y-2">
            {entity.pet_type_id && (
              <div className="flex justify-between">
                <span className="text-slate-600">Type</span>
                <span className="font-medium capitalize">{entity.pet_type_id}</span>
              </div>
            )}
            {entity.rating !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-600">Rating</span>
                <span className="font-medium">{entity.rating}%</span>
              </div>
            )}
            {entity.achievement_progress !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-600">Achievement Progress</span>
                <span className="font-medium">{entity.achievement_progress}%</span>
              </div>
            )}
            {entity.patron_count !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-600">Patrons</span>
                <span className="font-medium">{entity.patron_count}</span>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        {(entity.differ_by_coat_color ||
          entity.differ_by_coat_type ||
          entity.differ_by_size ||
          entity.differ_by_body_feature) && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Features</h3>
            <div className="flex flex-wrap gap-2">
              {entity.differ_by_coat_color && (
                <Badge variant="secondary">Different coat colors</Badge>
              )}
              {entity.differ_by_coat_type && (
                <Badge variant="secondary">Different coat types</Badge>
              )}
              {entity.differ_by_size && (
                <Badge variant="secondary">Different sizes</Badge>
              )}
              {entity.differ_by_body_feature && (
                <Badge variant="secondary">Different body features</Badge>
              )}
            </div>
          </div>
        )}

        {/* Action buttons - only in preview mode */}
        {isPreview && (
          <div className="space-y-3 pt-4">
            <Button
              className="w-full"
              onClick={onExpand}
            >
              View Full Details
            </Button>
            <Button
              variant="outline"
              className="w-full"
            >
              <Heart className="h-4 w-4 mr-2" />
              Add to Favorites
            </Button>
          </div>
        )}

        {/* Top items preview - only in preview mode */}
        {isPreview && entity.name && (
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">
                Top {entity.name} Pets
              </h3>
              <button
                className="text-sm text-primary-600 hover:text-primary-700"
                onClick={onExpand}
              >
                View all →
              </button>
            </div>
            <div className="space-y-3">
              {/* Mock pet items - TODO: Load from child tables */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-12 h-12 bg-slate-200 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">CH Majestic Thunder</p>
                  <p className="text-xs text-slate-600">Storm Crest Cattery</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-12 h-12 bg-slate-200 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">GC Silver Moon Rising</p>
                  <p className="text-xs text-slate-600">Moonlight Maine Coons</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
