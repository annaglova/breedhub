# 📦 Archived Documentation

This directory contains documentation for approaches that were explored but superseded by better solutions.

## Archived Documents

### OFFSET_BASED_PAGINATION.md
**Date:** 2025-10-06
**Reason:** Offset pagination doesn't work with partial RxDB cache
**Problem:** `skip(30)` in RxDB ≠ `range(30, 59)` in Supabase → missing records
**Superseded by:** ID-First Pagination

### KEYSET_PAGINATION.md
**Date:** 2025-10-21
**Reason:** Cursor pagination also doesn't work with partial cache
**Problem:** `WHERE name > 'X'` with partial cache → still missing records
**Superseded by:** ID-First Pagination

## Current Approach

**ID-First Pagination** (2025-10-21)
- Fetch IDs first (lightweight)
- Check RxDB cache by IDs
- Fetch only missing records
- 70% traffic reduction
- Works with ANY ORDER BY
- Works with partial cache ✅

**Documentation:** `/docs/ID_FIRST_PAGINATION.md`

---

**Why keep archives?**
- Historical context
- Learning from past approaches
- Reference for similar problems
- Document evolution of solution
