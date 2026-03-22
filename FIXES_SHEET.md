# FIXES SHEET — C(R)ITR Learning App
**Last updated: 22 March 2026**  
This file documents the current state of the application, what was broken, what fixes have been applied, and how to continue from here.

---

## 1. Application Overview

A learning/record management app (StagLuft/learning-app repo) that allows employees to:
- Browse and enrol on Courses, Assessments, and Pathways
- Track records of completions
- Submit experience feedback (group/batch support with multi-select referee)
- Managers manage course/assessment/pathway enrollments and details

**Stack:**
- Frontend: React (Vite, @ukic/react v2.29.1, @mdi/js)
- Backend: Node.js + Express + Prisma + PostgreSQL
- Deployment: Docker Compose (2 containers: frontend via nginx, backend via Node)

---

## 2. Current Git State

**Branch:** `main` (tracked against `origin/main`)

**Key commits (most recent first):**
```
38602ef  WIP: Save local changes before checking out previous commit   ← CURRENT HEAD
183021f  bug fixes to database and backend for type entry mismatch in course creation dialog
8cf2d04  Multiple Experience updates, in batch for group events (multi-select referee)  ← GOLD STANDARD COMMIT
3d56313  switch from local hosting to Docker Containerisation. Fix of errors preventing correct deployment
3ce6c37  Improve deployment configuration and scripts
c17dd94  changing static values ready for deployment beyond local system
d085421  Cleanup: Add .gitignore, untrack node_modules
ba64c50  Add pathway overlap recommendations and empty-state create flow
6736a74  UI/UX improvements: record sorting, referee feedback headers, export dialog fixes
```

**IMPORTANT:** Commit `8cf2d04` is the gold-standard working state with all desired features. It contains:
- Multi-select for experience feedback (batch group events with common referee)
- All dialog confirmation button de-duplication
- All advanced UI/UX features

---

## 3. What Was Working Before This Session

Everything in commit `8cf2d04` was confirmed working in the pre-Docker local dev environment:
- All pages loading correctly
- AssessmentManagement page loading without errors
- Multi-select experience feedback in ExperienceFeedback.jsx
- Single set of confirmation buttons in all dialogs (no duplicates)
- Record sorting, referee feedback headers, export dialog
- Course/Pathway/Assessment management pages
- Course catalogue, enrolment, cancellation
- Pathway overlap recommendations

---

## 4. What Went Wrong (Root Cause Analysis)

### Problem 1: AssessmentManagement Page Crashes
**Error:** `ReferenceError: Cannot access 'On' before initialization`  
**Stack trace:** Error thrown inside compiled bundle, not in source directly.

**Root Cause:** Rollup (Vite's production bundler) has a module evaluation order issue (Temporal Dead Zone / TDZ) when `@ukic/react` Tab components (`IcTabContext`, `IcTabGroup`, `IcTab`, `IcTabPanel`) are combined in the **same import statement** as Radio components (`IcRadioGroup`, `IcRadioOption`) at the top of the same file. `AssessmentManagement.jsx` is the only page that uses both Tabs and RadioGroups. `CourseManagement.jsx` uses Tabs, `CourseCatalogue.jsx` uses RadioGroups — never both.

**Status:** FIX APPLIED but NOT YET CONFIRMED working in Docker (Docker failed to open during this session).

### Problem 2: Circular Dependency in Utility Files  
**Error:** Circular imports causing potential initialization issues.

**Root Cause:** 
- `commonUtilities.js` defined `hasExpired()` and was importing from other modules
- `statusUtilities.js` imported `hasExpired` from `commonUtilities.js`
- This created a circular chain

**Fix Applied:** Created `frontEnd/src/commonFunctions/sharedUtils.js` as a shared utility with no dependencies. Both files now import from there.  
**Status:** CONFIRMED FIXED and committed.

### Problem 3: Duplicate Confirmation Buttons in Dialogs
**Root Cause:** `<IcDialog>` components across multiple pages were missing `hideDefaultControls="true"`, causing UKIC's built-in OK/Cancel buttons to appear alongside our custom ones.

**Files Fixed:**
- `frontEnd/src/pages/AssessmentManagement.jsx`
- `frontEnd/src/pages/Assessments.jsx`
- `frontEnd/src/pages/CourseCatalogue.jsx`
- `frontEnd/src/pages/Courses.jsx`

**Status:** CONFIRMED FIXED and committed in `38602ef`.

---

## 5. Fixes Applied in This Session

### Fix A: `sharedUtils.js` (NEW FILE)
**File:** `frontEnd/src/commonFunctions/sharedUtils.js`  
Contains `hasExpired()` function with no external dependencies.

### Fix B: `statusUtilities.js` Import Updated
Changed:
```js
import { hasExpired } from './commonUtilities';
```
To:
```js
import { hasExpired } from './sharedUtils';
```

### Fix C: `commonUtilities.js` Import Updated
Replaced the inline `hasExpired` function definition with:
```js
import { hasExpired } from './sharedUtils';
```

### Fix D: `hideDefaultControls="true"` Added to All IcDialog Instances
Added to all `<IcDialog>` components in:
- `AssessmentManagement.jsx`
- `Assessments.jsx`
- `CourseCatalogue.jsx`
- `Courses.jsx`

### Fix E: Split Import in `AssessmentManagement.jsx` (NOT YET CONFIRMED)
Changed the single import line to two separate imports to break Rollup's TDZ:
```js
// Line 2:
import { IcButton, IcCardVertical, IcStatusTag, IcTextField, IcTypography, IcSelect, IcAlert, IcHero, IcTabContext, IcTabGroup, IcTab, IcTabPanel, IcBadge, IcSectionContainer, IcDialog, IcSwitch } from "@ukic/react";
// Line 4-5 (separate import):
import { IcRadioGroup, IcRadioOption } from "@ukic/react";
```

### Fix F: `vite.config.js` Updated (NOT YET CONFIRMED)
Added to force Vite to pre-bundle `@ukic/react` as a single chunk and avoid Rollup circular init issues:
```js
optimizeDeps: {
  include: ['@ukic/react']
},
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'ukic-react': ['@ukic/react']
      }
    }
  }
}
```

---

## 6. What Is NOT Yet Confirmed Working

- [ ] **AssessmentManagement page loads without error in Docker** — The main goal. Fixes E and F above were applied but Docker could not be restarted to confirm during this session.
- [ ] **Multi-select referee in Experience Feedback** — Need to verify this feature is still present from commit `8cf2d04`. Check `frontEnd/src/pages/ExperienceFeedback.jsx` for multi-select referee logic.
- [ ] **Docker rebuild with all fixes** — Run `docker-compose up --build` from the project root once Docker Desktop is available.

---

## 7. How to Continue (Pick-Up Instructions)

### Step 1: Open project root in terminal
```
cd C:\Users\Owner\OneDrive\Documents\C(R)ITR\MJ
```

### Step 2: Confirm you're on main and up to date
```
git status
git log --oneline -5
```
Expected: on `main`, last commit is something like "chore: fixes and vite config for AssessmentManagement TDZ bug".

### Step 3: Start Docker and rebuild
Open Docker Desktop first, then:
```
docker-compose up --build
```

### Step 4: Test AssessmentManagement page
- Navigate to `http://localhost` after containers start
- Log in and go to the Assessment Management page
- **Expected:** Page loads without error
- **If error persists:** The TDZ fix didn't work. Next step would be to lazy-load AssessmentManagement in `index.jsx` using `React.lazy()`.

### Step 5: If AssessmentManagement still crashes — try lazy loading
In `frontEnd/src/index.jsx`, replace:
```js
import AssessmentManagement from './pages/AssessmentManagement.jsx'
```
With:
```js
const AssessmentManagement = React.lazy(() => import('./pages/AssessmentManagement.jsx'));
```
And wrap routes in `<React.Suspense fallback={<div>Loading...</div>}>`.

### Step 6: Verify multi-select referee in Experience Feedback
- Go to Experience Feedback page
- Check that group batch option with multi-referee select is present
- If missing, compare `ExperienceFeedback.jsx` against commit `8cf2d04`:
  ```
  git show 8cf2d04:frontEnd/src/pages/ExperienceFeedback.jsx
  ```

### Step 7: Check all management pages
- CourseManagement ✅ (was working)
- PathwayManagement ✅ (was working)
- AssessmentManagement ❓ (fix applied, needs testing)

---

## 8. File Inventory (Key Files Modified This Session)

| File | Status | Notes |
|------|--------|-------|
| `frontEnd/src/commonFunctions/sharedUtils.js` | ✅ New, committed | Breaks circular dep |
| `frontEnd/src/commonFunctions/statusUtilities.js` | ✅ Fixed, committed | Uses sharedUtils |
| `frontEnd/src/commonFunctions/commonUtilities.js` | ✅ Fixed, committed | Uses sharedUtils |
| `frontEnd/src/pages/AssessmentManagement.jsx` | ⚠️ Fixed, NOT tested in Docker | Split import + hideDefaultControls |
| `frontEnd/src/pages/Assessments.jsx` | ✅ Fixed, committed | hideDefaultControls |
| `frontEnd/src/pages/CourseCatalogue.jsx` | ✅ Fixed, committed | hideDefaultControls |
| `frontEnd/src/pages/Courses.jsx` | ✅ Fixed, committed | hideDefaultControls |
| `frontEnd/vite.config.js` | ⚠️ Fixed, NOT tested in Docker | optimizeDeps + manualChunks |

---

## 9. Docker / Deployment Notes

The application runs via Docker Compose with two services:
- `frontend` — Vite build served via nginx on port 80
- `backend` — Node.js/Express on port 5000

**To start:**
```
docker-compose up --build
```

**To stop:**
```
docker-compose down
```

**If you see "no configuration file provided":** You are not in the project root. `cd` to `C:\Users\Owner\OneDrive\Documents\C(R)ITR\MJ` first.

**If git index.lock error:** A git process crashed. Delete: `.git\index.lock` then close all editors/terminals and retry.

---

## 10. Branch Strategy

- `main` — working branch, all changes here
- `splinter` — was used during this session, not needed, can be deleted
- To delete: `git branch -d splinter`

---
