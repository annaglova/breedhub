# Drawer/Fullscreen Architecture Fix

## Problem

SpaceComponent has multiple return blocks for different drawer states, which prevents CSS transitions from working when switching between drawer and fullscreen modes.

### Current (Wrong) Architecture

```tsx
function SpaceComponent() {
  // PROBLEM: Early return for fullscreen - creates separate DOM tree
  if (isFullscreen && initialSelectedEntityId) {
    return (
      <div className="fullscreen-container">
        {children}
      </div>
    );
  }

  // Main return with drawer
  return (
    <div className="space-with-drawer">
      <SpaceList />
      {/* Drawer for side/over modes */}
      {(drawerMode === "side" || drawerMode === "over") && (
        <div className="drawer">...</div>
      )}
      {/* Drawer for side-transparent mode */}
      {drawerMode === "side-transparent" && (
        <div className="drawer-transparent">...</div>
      )}
    </div>
  );
}
```

**Issues:**
1. Early return for fullscreen (line 974-988) creates completely different DOM tree
2. React unmounts old tree and mounts new one - no transition possible
3. Multiple drawer divs for different modes (side/over vs side-transparent)

### Target (Correct) Architecture

```tsx
function SpaceComponent() {
  return (
    <div className="space-container">
      {/* SpaceList - hidden when fullscreen */}
      {!isFullscreen && <SpaceList />}

      {/* Single Drawer component with isFullscreen prop */}
      <Drawer
        isOpen={isDrawerOpen}
        isFullscreen={isFullscreen}
        mode={drawerMode}
      >
        {children}
      </Drawer>
    </div>
  );
}
```

**Benefits:**
1. Single Drawer element that changes styles based on props
2. CSS transitions work because same DOM element changes classes
3. Smooth animation between drawer ↔ fullscreen

## Implementation Plan

### Step 1: Analyze drawer modes and their styles

Current modes:
- `over` - fullscreen overlay on mobile (<768px) or when isFullscreen=true
- `side` - side drawer with backdrop (768px-1536px)
- `side-transparent` - side drawer without backdrop (>1536px)

Styles per mode:
| Mode | Width | Position | Background | Rounded | Shadow |
|------|-------|----------|------------|---------|--------|
| over | inset-0 (full) | absolute inset-0 | bg-white | no | no |
| over + fullscreen | inset-0 | absolute inset-0 | card-surface | no | no |
| side | w-[40rem] | absolute right-0 | bg-white | rounded-l-xl | shadow-xl |
| side-transparent | w-[45rem] | absolute right-0 | card-surface | rounded-l-xl | no |

### Step 2: Remove early return for fullscreen

Delete lines 969-988 (the early return block for fullscreen).

### Step 3: Merge drawer rendering into single element

Replace the two drawer blocks (side/over and side-transparent) with a single drawer that:
- Uses `transition-all duration-300` for smooth transitions
- Changes width/position based on `isFullscreen` and `drawerMode`
- Always stays in DOM (controlled by opacity/pointer-events)

### Step 4: Update drawer styles for fullscreen

When `isFullscreen`:
- Width: full (inset-0)
- Background: card-surface (not bg-white)
- No rounded corners
- No shadow
- Animate from current width to full width

### Step 5: Test transitions

Test cases:
1. Open drawer (click entity) - should slide in from right
2. Expand to fullscreen - should smoothly expand to full width
3. Collapse from fullscreen - should smoothly shrink back
4. Close drawer - should slide out to right

## TODO

- [ ] Remove early return block for fullscreen (lines 974-988)
- [ ] Create unified drawer styles object based on mode + isFullscreen
- [ ] Merge side/over and side-transparent drawer blocks into one
- [ ] Add proper transition classes for width/inset changes
- [ ] Ensure backdrop animates correctly
- [ ] Test all transition scenarios
- [ ] Verify no visual regressions
