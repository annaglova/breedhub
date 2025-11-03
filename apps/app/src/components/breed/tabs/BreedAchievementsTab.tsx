/**
 * BreedAchievementsTab - Achievements timeline tab
 *
 * REFERENCE: /Users/annaglova/projects/org/.../breed-support-levels.component.ts
 *
 * TODO Phase 4: Implement timeline with real mock data
 * For now - simple placeholder
 */
export function BreedAchievementsTab() {
  return (
    <div className="mt-3 px-6">
      <p className="text-muted-foreground text-lg">
        Achievements timeline will be implemented in Phase 4...
      </p>
      <div className="mt-4 space-y-4">
        <div className="p-4 border border-border rounded-lg">
          <h3 className="font-semibold text-lg">Golden Achievement</h3>
          <p className="text-primary font-bold">$5,000</p>
          <p className="text-sm text-muted-foreground mt-2">
            Reached 5000 supporters milestone
          </p>
        </div>
        <div className="p-4 border border-border rounded-lg">
          <h3 className="font-semibold text-lg">Silver Achievement</h3>
          <p className="text-primary font-bold">$1,000</p>
          <p className="text-sm text-muted-foreground mt-2">
            First 1000 supporters
          </p>
        </div>
      </div>
    </div>
  );
}
