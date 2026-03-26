# Codex Agent Setup: Smartaf Stitch Migration

Use this as the startup context for another Codex agent working in this repo.

## Paste-Ready Prompt

You are continuing an in-progress Smartaf Stitch migration inside an Expo React Native app.

### Repository
- Root: `/Users/shaked/Code/babysit-connect`

### First files to read
- `CLAUDE.md`
- `docs/DESIGN.md`
- `.stitch/DESIGN.md`
- `docs/plans/2026-03-22-stitch-screen-implementation-plan.md`

### MCP / Stitch setup
- MCP config file: `.vscode/mcp.json`
- Stitch MCP server URL: `https://stitch.googleapis.com/mcp`
- Use the existing repo config rather than inventing your own setup.
- Confirmed Stitch project id from the design docs: `13871230181787804912`

### Required workflow
1. Inspect the real app screen/component first.
2. Inspect the matching Stitch screen through MCP and Stitch skills.
3. Treat Stitch as the exact visual source of truth.
4. Treat the existing Expo app as the logic and behavior source of truth.
5. Implement only one small safe chunk at a time.
6. Stop after each chunk and report:
   - exact files changed
   - exact Stitch screens used
   - exact Stitch tools / skills used
   - what matches closely
   - what still differs and why
   - manual test checklist

### Must-use rules
- Preserve Hebrew-first, full RTL.
- Do not remove real app fields because Stitch is simpler.
- Do not invent fake features or fake data.
- No backend or schema changes unless absolutely necessary.
- No broad blind rewrites.
- No unrelated refactors.
- Keep Smartaf branding consistent across the whole app.

### Skills to use
- `stitch-design`
- `react:components`

### Current visual source-of-truth files
- App-wide rules: `CLAUDE.md`, `.stitch/DESIGN.md`, `docs/DESIGN.md`
- Cached Stitch HTML / PNG references: `.stitch/designs/`

### Important warning
- The git worktree is intentionally dirty.
- Do not revert unrelated changes.
- Do not delete existing `.stitch/designs` assets.
- Do not "clean up" modified files unless explicitly asked.

### Current project status
- Large parts of the Smartaf Stitch redesign are already implemented across auth, onboarding, parent discovery, babysitter discovery, chats, profile surfaces, saved/favorites, drawer, settings, ratings, booking history, and shared primitives.
- The repo already contains many cached Stitch screens in `.stitch/designs`.
- Shared Smartaf brand treatment exists, including `components/ui/SmartafWordmark.tsx`.

### Validation baseline
- `npx tsc --noEmit` passes
- `npm run lint` passes with warning-only baseline
- Current known baseline from latest run:
  - `7 warnings, 0 errors`

### Known lint warning baseline
- `app/chat.tsx`
- `app/create-post.tsx`
- `components/ui/AppTextArea.tsx`
- `components/ui/AvatarCircle.tsx`
- `components/ui/ProfileStatTile.tsx`

### Recent bug-fix chunk already applied
- `app/parent-onboarding.tsx`
- `app/parent.tsx`
- `components/parent/BabysitterCard.tsx`
- `components/babysitter/ParentPostCard.tsx`
- `app/about.tsx`
- `app/babysitter-onboarding.tsx`

Those fixes were for:
- onboarding illustration overlap
- parent discovery header / decorative orb crowding
- editorial babysitter card avatar spacing
- babysitter-side parent post card avatar overlap
- about screen top header/orb crowding
- babysitter onboarding top spacing

### Current dirty areas
The repo has many modified files, including but not limited to:
- `app/`
- `components/`
- `locales/`
- `.stitch/designs/`
- `CLAUDE.md`
- `tsconfig.json`

Assume the current worktree contains valid in-progress migration work unless proven otherwise.

### What to do next
- Start by reading `CLAUDE.md`.
- Then inspect the target app screen.
- Then inspect its exact Stitch counterpart through MCP and the cached `.stitch/designs` files.
- Implement only that next safe chunk.
- Do not restart the migration from zero.

## Short Human Summary

This repo is mid-migration from an older BabyCity-like UI into a Smartaf Stitch-defined design system. The next agent should behave like a continuation worker, not a fresh auditor.

The most important thing is to preserve the real app behavior while matching Stitch screen-by-screen. The app already has a lot of Smartaf work in place, so the next agent should compare against the live code and the Stitch assets instead of making broad stylistic changes.
