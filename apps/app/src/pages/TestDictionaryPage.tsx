import React, { useState } from "react";
import { DropdownInput, LookupInput } from "@ui/components/form-inputs";
import { spaceStore } from "@breedhub/rxdb-store";

export function TestDictionaryPage() {
  const [coatColorDropdown, setCoatColorDropdown] = useState<string>("");
  const [coatColorLookup, setCoatColorLookup] = useState<string>("");
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
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Dictionary & Filtering Test
        </h1>

        <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
          {/* Coat Color Dropdown - для тестування dropdown з багатьма записами */}
          <div>
            <DropdownInput
              label="🎨 Coat Color Dropdown (Dictionary - ID-First)"
              placeholder="Select coat color"
              referencedTable="coat_color"
              referencedFieldID="id"
              referencedFieldName="name"
              value={coatColorDropdown}
              onValueChange={setCoatColorDropdown}
            />
            <p className="mt-1 text-xs text-gray-500">
              DropdownInput → DictionaryStore.getDictionary() with ID-First
            </p>
          </div>

          {/* Coat Color Lookup - для тестування search + scroll */}
          <div>
            <LookupInput
              label="🔍 Coat Color Lookup (Dictionary - ID-First)"
              placeholder="Type to search colors..."
              referencedTable="coat_color"
              referencedFieldID="id"
              referencedFieldName="name"
              value={coatColorLookup}
              onValueChange={setCoatColorLookup}
            />
            <p className="mt-1 text-xs text-gray-500">
              LookupInput → DictionaryStore.getDictionary() with search + scroll
            </p>
          </div>

          {/* Breed Lookup with Collection Mode - MAIN TEST */}
          <div className="border-t pt-4">
            <LookupInput
              label="🔥 Breed (Collection Mode - SpaceStore.applyFilters)"
              placeholder="Type to search breeds..."
              referencedTable="breed"
              referencedFieldID="id"
              referencedFieldName="name"
              dataSource="collection"
              value={breed}
              onValueChange={setBreed}
            />
            <p className="mt-1 text-xs text-gray-500">
              Uses SpaceStore.applyFilters() → RxDB first, then Supabase
            </p>
          </div>

          {/* SpaceStore.applyFilters() Button Test */}
          <div className="border-t pt-4">
            <button
              onClick={testApplyFilters}
              disabled={filterLoading}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium"
            >
              {filterLoading ? '🔄 Searching...' : '🧪 Test applyFilters: name="golden"'}
            </button>

            {filterResults.length > 0 && (
              <div className="mt-3 p-3 bg-purple-50 rounded border border-purple-200">
                <p className="text-sm font-semibold mb-2">
                  ✅ Found {filterResults.length} breeds:
                </p>
                <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {filterResults.map((record, i) => (
                    <li key={record.id || i} className="text-gray-700">
                      • {record.name || record.id}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Console hint */}
          <p className="text-xs text-gray-500 text-center pt-2">
            💡 Open browser console to see [SpaceStore] logs
          </p>
        </div>
      </div>
    </div>
  );
}
