# StudySync — Design Decisions

Ambiguities resolved during development. Each entry states the question, the choice, and the rationale.

---

## 1. Account deletion approach

**Question**: Should `delete-account` use a Supabase Edge Function with the service role key, or a client-side Supabase Auth call?

**Choice**: Supabase Auth's `signOut` + `auth.admin.deleteUser` via an Edge Function. The service role key never leaves the server.

**Rationale**: The client-side `supabase.auth.deleteUser()` requires the service role key in the browser, which violates the "anon key only" rule. An Edge Function keeps the service role key server-side. The cascade deletes all application data automatically.

---

## 2. Drag-and-drop library

**Question**: Use a library (react-beautiful-dnd, dnd-kit) or native HTML5 drag-and-drop?

**Choice**: Native HTML5 drag-and-drop.

**Rationale**: The only drag-and-drop interaction is moving a weekly plan block to another day column — a simple, single-axis operation. A library would add significant bundle weight (dnd-kit is ~12 kB gzipped) for no meaningful UX gain at this interaction complexity. YAGNI.

---

## 3. Demo mode storage

**Question**: IndexedDB, sessionStorage, or localStorage for demo state?

**Choice**: `localStorage` with JSON serialisation.

**Rationale**: The demo needs to survive a page refresh (so the examiner can navigate between pages without losing state), ruling out sessionStorage. The data volume is tiny (< 50 kB for 15 topics + 60 days of tasks). IndexedDB would be overkill. `localStorage` with a versioned key (`studysync_demo`) is simple, synchronous, and debuggable in DevTools.

---

## 4. CSP `unsafe-inline` for styles

**Question**: Tailwind CSS generates utility classes at runtime, which requires `style-src 'unsafe-inline'`. Can we avoid it?

**Choice**: Allow `'unsafe-inline'` for `style-src` only.

**Rationale**: Tailwind CSS v3 uses a JIT compiler that generates styles as class attributes, not inline `style=""` attributes — so the XSS risk from `unsafe-inline` for styles is very low (the attacker would need to inject a `<style>` block, not just an attribute). Restricting `script-src` to `'self'` is the critical XSS mitigation. This is documented in `SECURITY.md`.

---

## 5. No Redux / Zustand

**Question**: Should global state use a state management library?

**Choice**: React `useState` / `useReducer` + custom hooks + `localStorage`.

**Rationale**: The app has three orthogonal data domains (auth, plan, demo). Each is managed by a dedicated hook. No cross-cutting shared mutations require a global store. Adding Redux or Zustand would double the state surface for no observable benefit at this scale.

---

## 6. Planner removes blocks shorter than 10 minutes

**Question**: Should very short remaining gaps (e.g. 8 minutes) be scheduled?

**Choice**: Skip blocks shorter than 10 minutes.

**Rationale**: A sub-10-minute study block provides negligible academic value and creates UI noise. The 10-minute floor is below the minimum block setting (15 min), so it only triggers for near-exhausted topics near the end of a day's capacity.

---

## 7. `noUnusedLocals` / `noUnusedParameters` in tsconfig

**Question**: Enable strict unused-variable checking?

**Choice**: Yes, enabled in `tsconfig.app.json`.

**Rationale**: Forces clean imports and prevents dead code accumulating. Any genuine suppression requires an explicit `// eslint-disable` comment with a reason.

---

## 8. Recharts v2 vs v3

**Question**: The `recharts` package now recommends v3. Should we upgrade?

**Choice**: Stay on v2 for now (v2.13.x).

**Rationale**: The v3 migration guide warns of breaking API changes. The charts used here (BarChart, Cell) work correctly on v2. Upgrading mid-project introduces risk with no feature benefit for this use case. Noted as a future maintenance item.
