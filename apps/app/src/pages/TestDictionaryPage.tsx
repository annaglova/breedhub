import React, { useState } from "react";
import { DropdownInput, LookupInput } from "@ui/components/form-inputs";

export function TestDictionaryPage() {
  const [petType, setPetType] = useState<string>("");
  const [coatColor, setCoatColor] = useState<string>("");
  const [breed, setBreed] = useState<string>("");

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
        </div>
      </div>
    </div>
  );
}
