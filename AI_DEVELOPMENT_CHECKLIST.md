# AI Development Checklist

> 📌 **Актуальна архітектура**: [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Local-First PWA з CRDT та AI

## ✅ MANDATORY Checklist for Every Feature

**This checklist MUST be followed by AI for EVERY feature implementation.**

> **Оновлено для Local-First**: Тести тепер включають офлайн сценарії та CRDT синхронізацію

### 📝 Step-by-Step Process

```markdown
## Feature: [FEATURE_NAME]

### 1️⃣ Test First (RED Phase)
- [ ] Created test file: `[feature].test.ts`
- [ ] Wrote failing test for happy path
- [ ] Wrote failing test for error case
- [ ] Wrote failing test for edge case
- [ ] Ran tests and confirmed they FAIL ❌

### 2️⃣ Implementation (GREEN Phase)
- [ ] Wrote minimal code to pass tests
- [ ] All tests now PASS ✅
- [ ] No TypeScript errors
- [ ] Code builds successfully

### 3️⃣ Refactor (REFACTOR Phase)
- [ ] Improved code quality
- [ ] Added proper types
- [ ] Extracted reusable functions
- [ ] All tests STILL PASS ✅

### 4️⃣ Integration
- [ ] Added example to playground
- [ ] Tested in browser (http://localhost:5174)
- [ ] Checked browser console for errors (F12)
- [ ] Feature works as expected

### 5️⃣ Documentation
- [ ] Updated relevant README
- [ ] Added JSDoc comments
- [ ] Created usage example
- [ ] Documented breaking changes (if any)

### 6️⃣ Final Verification
- [ ] `pnpm build` - SUCCESS
- [ ] `pnpm typecheck` - NO ERRORS
- [ ] `pnpm test` - ALL PASS
- [ ] Browser test - WORKS
- [ ] Console - NO ERRORS
```

## 🚫 Common Mistakes to Avoid

1. **❌ Writing code without tests first**
   ```typescript
   // WRONG - No test exists
   function addEntity(data) { 
     return { ...data, id: generateId() };
   }
   ```

2. **❌ Not verifying in browser**
   ```typescript
   // WRONG - Only tested in theory
   console.log("Should work"); // But never actually checked
   ```

3. **❌ Skipping error cases**
   ```typescript
   // WRONG - Only happy path tested
   test('adds entity', () => { /* ... */ });
   // Missing: error cases, edge cases
   ```

## ✅ Correct Example

```typescript
// 1. FIRST - Write test
describe('addEntity', () => {
  it('should add entity with generated ID', () => {
    const store = createStore();
    const result = store.addEntity({ name: 'Test' });
    expect(result.id).toBeDefined();
    expect(result.name).toBe('Test');
  });
  
  it('should reject invalid entity', () => {
    const store = createStore();
    expect(() => store.addEntity(null)).toThrow();
  });
  
  it('should handle empty object', () => {
    const store = createStore();
    const result = store.addEntity({});
    expect(result.id).toBeDefined();
  });
});

// 2. THEN - Write implementation
function addEntity(data) {
  if (!data) throw new Error('Data required');
  return { 
    ...data, 
    id: data.id || generateId(),
    createdAt: new Date()
  };
}

// 3. FINALLY - Test in browser
// Go to playground and actually use it!
```

## 🔍 Verification Commands

Run these IN ORDER:

```bash
# 1. Check types
pnpm typecheck

# 2. Build package
pnpm build

# 3. Run tests
pnpm test

# 4. Start playground
pnpm dev:playground

# 5. Open browser
open http://localhost:5174/test
```

## 📋 Copy-Paste Template

Use this template for EVERY feature:

```markdown
## Feature: [NAME]

### Tests Written
- [ ] `src/__tests__/[feature].test.ts` created
- [ ] Happy path test
- [ ] Error handling test  
- [ ] Edge case test

### Implementation
- [ ] Code written
- [ ] Tests pass
- [ ] Types correct

### Verification
- [ ] Built successfully
- [ ] Playground example works
- [ ] Browser console clean
- [ ] Manually tested

### Documentation
- [ ] README updated
- [ ] Example added
- [ ] Comments added

✅ Ready to commit!
```

## 🎯 Success Metrics

Feature is COMPLETE when:
- ✅ All tests pass (100%)
- ✅ No TypeScript errors (0)
- ✅ No console errors (0)
- ✅ Works in playground
- ✅ Documentation exists

## ⚠️ REMEMBER

**NEVER say "done" without checking this list!**

If you skip these steps, the code WILL have bugs.

---

*Last updated: Each time AI implements a feature, this checklist MUST be followed.*