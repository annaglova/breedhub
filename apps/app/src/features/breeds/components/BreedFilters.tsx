import React from 'react';
import { Card } from '@ui/components/card';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { RadioGroup, RadioGroupItem } from '@ui/components/radio-group';
import { Checkbox } from '@ui/components/checkbox';
import { Search, Filter, X, Dog, Cat } from 'lucide-react';

interface BreedFiltersProps {
  filters: {
    search: string;
    petType: 'all' | 'dog' | 'cat';
    hasPhotos: boolean;
    hasPatrons: boolean;
  };
  onFiltersChange: (filters: any) => void;
  onReset: () => void;
}

export function BreedFilters({ filters, onFiltersChange, onReset }: BreedFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handlePetTypeChange = (value: string) => {
    onFiltersChange({ ...filters, petType: value });
  };

  const handleCheckboxChange = (field: string, checked: boolean) => {
    onFiltersChange({ ...filters, [field]: checked });
  };

  const hasActiveFilters = filters.petType !== 'all' || filters.hasPhotos || filters.hasPatrons;

  return (
    <Card className="p-4 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 px-2"
            >
              <X className="w-4 h-4 mr-1" />
              Reset
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="search"
              type="text"
              placeholder="Search breeds..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Pet Type Filter */}
      <div className="space-y-3">
        <Label>Pet Type</Label>
        <RadioGroup value={filters.petType} onValueChange={handlePetTypeChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all" className="font-normal cursor-pointer">
              All types
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="dog" id="dog" />
            <Label htmlFor="dog" className="font-normal cursor-pointer flex items-center gap-2">
              <Dog className="w-4 h-4" />
              Dogs only
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cat" id="cat" />
            <Label htmlFor="cat" className="font-normal cursor-pointer flex items-center gap-2">
              <Cat className="w-4 h-4" />
              Cats only
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Additional Filters */}
      <div className="space-y-3">
        <Label>Additional Filters</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasPhotos"
              checked={filters.hasPhotos}
              onCheckedChange={(checked) => handleCheckboxChange('hasPhotos', checked as boolean)}
            />
            <Label htmlFor="hasPhotos" className="font-normal cursor-pointer">
              Has photos
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasPatrons"
              checked={filters.hasPatrons}
              onCheckedChange={(checked) => handleCheckboxChange('hasPatrons', checked as boolean)}
            />
            <Label htmlFor="hasPatrons" className="font-normal cursor-pointer">
              Has patrons
            </Label>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <span>Total breeds:</span>
          <span className="font-medium">10</span>
        </div>
        <div className="flex justify-between">
          <span>Filtered:</span>
          <span className="font-medium">10</span>
        </div>
      </div>
    </Card>
  );
}