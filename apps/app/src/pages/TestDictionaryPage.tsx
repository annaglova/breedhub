import React, { useState } from "react";
import { DropdownInput, LookupInput } from "@ui/components/form-inputs";
import { spaceStore } from "@breedhub/rxdb-store";

export function TestDictionaryPage() {
  const [petType, setPetType] = useState<string>("");
  const [coatColor, setCoatColor] = useState<string>("");
  const [breed, setBreed] = useState<string>("");
  const [filterResults, setFilterResults] = useState<any[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);

  // Test applyFilters
  const testApplyFilters = async () => {
    setFilterLoading(true);
    try {
      console.log('[TestPage] Testing spaceStore.applyFilters() with search "golden"');

      const result = await spaceStore.applyFilters(
        'breed',
        { name: 'golden' },  // Search for breeds with "golden" in name
        { limit: 30 }
      );

      console.log('[TestPage] Filter results:', result);
      setFilterResults(result.records);
    } catch (error) {
      console.error('[TestPage] Filter test error:', error);
    } finally {
      setFilterLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Dictionary Store Test
        </h1>

        <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Test Dictionary Components</h2>
            <p className="text-gray-600 mb-6">
              Open browser console to see dictionary loading logs
            </p>
            <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
              <div className="p-3 bg-blue-50 rounded">
                <strong>DropdownInput:</strong> Always uses DictionaryStore cache
              </div>
              <div className="p-3 bg-green-50 rounded">
                <strong>LookupInput (Dictionary):</strong> Uses DictionaryStore + search
              </div>
              <div className="p-3 bg-purple-50 rounded">
                <strong>LookupInput (Collection):</strong> Uses existing RxDB collection
              </div>
            </div>
          </div>

          {/* Pet Type Dropdown */}
          <div>
            <h3 className="text-lg font-medium mb-2">Pet Type (DropdownInput)</h3>
            <DropdownInput
              label="Pet Type"
              placeholder="Select pet type"
              referencedTable="pet_type"
              referencedFieldID="id"
              referencedFieldName="name"
              value={petType}
              onValueChange={setPetType}
            />
            {petType && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {petType}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">LookupInput Test</h2>
          </div>

          {/* Coat Color Lookup */}
          <div>
            <h3 className="text-lg font-medium mb-2">Coat Color (Lookup with Search - Dictionary Mode)</h3>
            <LookupInput
              label="Coat Color"
              placeholder="Type to search coat colors..."
              referencedTable="coat_color"
              referencedFieldID="id"
              referencedFieldName="name"
              value={coatColor}
              onValueChange={setCoatColor}
            />
            {coatColor && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {coatColor}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              💡 Focus + type to search. Debounced (300ms). Scroll for more results.
            </p>
            <p className="mt-2 text-xs text-blue-600 font-medium">
              Mode: Dictionary (uses DictionaryStore cache)
            </p>
          </div>

          {/* Breed Lookup with Collection Mode */}
          <div>
            <h3 className="text-lg font-medium mb-2">Breed (Lookup - Collection Mode)</h3>
            <LookupInput
              label="Breed"
              placeholder="Type to search breeds..."
              referencedTable="breed"
              referencedFieldID="id"
              referencedFieldName="name"
              dataSource="collection"
              value={breed}
              onValueChange={setBreed}
            />
            {breed && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {breed}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              💡 Focus + type to search. Uses existing RxDB collection instead of DictionaryStore.
            </p>
            <p className="mt-2 text-xs text-green-600 font-medium">
              Mode: Collection (uses existing breed RxDB collection)
            </p>
          </div>

          {/* Debug Info */}
          <div className="mt-8 p-4 bg-gray-100 rounded">
            <h3 className="text-sm font-semibold mb-2">Debug Info</h3>
            <p className="text-xs text-gray-600">
              Check browser console for:
            </p>
            <ul className="text-xs text-gray-600 list-disc list-inside mt-2">
              <li>[DictionaryStore] Loading tableName...</li>
              <li>[DictionaryStore] Loaded X records for tableName</li>
            </ul>
            <p className="text-xs text-gray-600 mt-2">
              Also available in console: window.dictionaryStore
            </p>
          </div>

          {/* SpaceStore.applyFilters() Test */}
          <div className="mt-8 p-4 bg-purple-50 rounded border-2 border-purple-200">
            <h3 className="text-lg font-semibold mb-3">SpaceStore.applyFilters() Test</h3>
            <p className="text-sm text-gray-700 mb-4">
              Test the new universal filtering method. Searches for breeds with "golden" in name.
            </p>
            <button
              onClick={testApplyFilters}
              disabled={filterLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
            >
              {filterLoading ? 'Searching...' : 'Test Filter: name="golden"'}
            </button>

            {filterResults.length > 0 && (
              <div className="mt-4 p-3 bg-white rounded">
                <p className="text-sm font-medium mb-2">
                  Found {filterResults.length} results:
                </p>
                <ul className="text-xs text-gray-600 list-disc list-inside max-h-40 overflow-y-auto">
                  {filterResults.map((record, i) => (
                    <li key={record.id || i}>
                      {record.name || record.id}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
