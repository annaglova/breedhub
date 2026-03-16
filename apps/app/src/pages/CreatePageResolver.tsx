import { useSearchParams, useNavigate } from 'react-router-dom';
import { SpacePage } from './SpacePage';

/**
 * CreatePageResolver - Resolves /new?entity=pet URLs for create mode
 *
 * Handles URLs like /new?entity=pet by:
 * 1. Reading entity type from query param
 * 2. Rendering SpacePage with createMode=true (always fullscreen)
 */
export function CreatePageResolver() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const entityType = searchParams.get('entity');

  if (!entityType) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-8xl mb-4 text-slate-300">?</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Entity type required</h1>
          <p className="text-slate-600 mb-6">Missing ?entity= parameter</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <SpacePage
      entityType={entityType}
      createMode={true}
    />
  );
}
