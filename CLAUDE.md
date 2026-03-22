# CLAUDE.md

## Project Overview

This is a mobile-first childcare / babysitter marketplace app built with:

- Expo React Native
- TypeScript
- Supabase
- Hebrew-first UI
- Full RTL support

The app has two main user modes:

1. **Parent mode**
   - browse babysitters
   - create posts / ads looking for a babysitter
   - send structured requests
   - chat after acceptance when allowed by the current product flow
   - manage profile

2. **Babysitter mode**
   - browse parent posts
   - receive and send structured requests
   - chat after acceptance when allowed by the current product flow
   - manage profile
   - use shift / work / income management features that already exist in some form

A single authenticated phone-based account may have:
- parent only
- babysitter only
- both roles

---

## Role / Account Rules

### Single account per phone number
There should be only one account per phone number.

A single phone-auth account may own:
- a parent profile
- a babysitter profile
- both

### Important current product rule
Users may have both roles on the same account, but they **must log out to enter as the other role**.

That means:

- if a user has only one role, enter that role directly after login
- if a user has both roles, show role choice immediately after login
- once the user enters parent mode or babysitter mode, there should be **no in-app role switching**
- to use the other role, the user must log out and log in again

### Do not reintroduce in-app switching
Do not add or preserve drawer/settings/profile role-switch actions unless explicitly requested.
Any old in-app switch-role logic should be considered deprecated unless the user asks to restore it.

---

## Product Direction

This is not just a simple marketplace.

The product direction is:

- help parents and babysitters build trusted ongoing relationships
- support both discovery and structured first contact
- support parent posts / ads and direct browsing
- make the app useful beyond one-time matching
- improve trust, retention, and repeat usage over time
- gradually support babysitter business-management features like work/shift tracking, hours, and income

Important product principles:

- first contact should be structured, not random open chat
- quick message requests and full childcare requests may both exist
- acceptance / decline logic should remain clear
- parent mode and babysitter mode should feel like the same app, not two unrelated products

---

## Core UX Principles

### Hebrew-first and RTL
This app is Hebrew-first.
All UI must feel natural in Hebrew and RTL.

Always check:
- text alignment
- icon placement
- row direction
- spacing in RTL layouts
- truncation / overflow in Hebrew
- button hierarchy in RTL forms and cards
- natural Hebrew wording, not translated-feeling UI

Do not treat RTL as an afterthought.

### Mobile-first
Design and implement for phones first.
Avoid desktop-first or web-heavy patterns unless explicitly requested.

### Consistency
The app should feel coherent across:
- onboarding
- profiles
- cards
- requests
- chat
- posts
- forms
- drawer
- bottom navigation
- parent mode
- babysitter mode

Prefer shared primitives over one-off styling.

### Simplicity
Prefer:
- clear primary actions
- strong hierarchy
- low clutter
- fewer but stronger UI elements
- safe gradual improvements

Avoid:
- duplicate actions
- redundant buttons
- crowded headers
- too many competing chips/tags/buttons
- multiple ways to do the same thing unless clearly justified

---

## Design System Expectations

The app should use a shared design language based on the BabyCity direction:

- soft and caring
- modern and polished
- rounded cards and surfaces
- subtle shadows
- blue-violet primary accents
- light blue / cyan secondary accents
- airy spacing
- calm, clear typography hierarchy

Parent mode and babysitter mode should share the same system.
Only vary emphasis slightly:
- parent mode = softer / discovery-oriented
- babysitter mode = slightly more professional / dashboard-oriented

When improving UI:
- prefer updating shared theme tokens and reusable components first
- avoid hardcoding styles separately on every screen

---

## Technical Working Rules

### Work in small safe chunks
Do not perform broad rewrites unless explicitly requested.

For each task:
1. inspect current code first
2. understand what already exists
3. implement only the minimum safe change
4. explain what changed
5. stop so the result can be tested

### Preserve working flows
Do not break:
- auth
- login / logout
- role choice after login
- onboarding
- profile loading
- request flow
- chat flow
- navigation
- existing shift-management / babysitter business-manager functionality

### Avoid hidden backend changes
If a task needs backend/schema/RLS/storage changes:
- inspect existing migrations first
- update the correct local migration file in `supabase/migrations`
- explicitly state which migration was added or changed
- do not make undocumented backend changes

### Prefer reuse
Before creating new components or flows:
- look for existing shared components
- look for existing types/models
- look for existing routes
- look for existing UI patterns
- look for already-implemented shift/stats/business-manager features before rebuilding them

Do not duplicate logic unnecessarily.

---

## Data / Backend Guidance

Supabase is the source of truth.

Be especially careful with:
- role logic
- request status transitions
- conversation creation
- parent vs babysitter identifiers
- profile ownership
- storage paths
- RLS safety
- parent posts
- shift / work / income tracking if already implemented

When changing data models:
- preserve backward compatibility if practical
- avoid leaving dead schema behind
- avoid parallel concepts with overlapping purpose
- do not silently replace existing shift-management structures without first inspecting what already exists

---

## Navigation Guidance

The app uses:
- bottom navigation
- side drawer / sidebar
- screen flows for forms, profiles, requests, chat, stats, and management tools

Navigation should stay coherent and low-friction.

Prefer:
- one clear source of truth for major destinations
- no redundant entry points unless clearly justified
- no duplicate actions in both bottom nav and drawer without reason

Important:
- do not add in-app role switching
- role choice belongs at login time if the account has both roles
- once inside a mode, navigation should behave as if that mode is the active session until logout

---

## Form Guidance

Forms are important in this app.
They should be:

- visually consistent
- easy to scan
- RTL-correct
- clearly labeled
- not overcrowded
- aligned with the app shell and design language

All forms should feel like part of the same product:
- onboarding forms
- edit profile forms
- request forms
- post creation/edit forms
- settings-related forms
- shift/business-manager forms

Avoid detached “old-style” form screens.

Prefer:
- shared input components
- shared textarea/select/date/time patterns
- consistent spacing and button placement
- obvious save / submit flows

---

## Chat / Request Guidance

The request and chat system is a core user flow.

Protect these principles:
- first contact should remain structured unless explicitly changed
- request states must be clear
- accept / decline logic must be reliable
- chat should open only when the intended product rule allows it
- request and conversation flows must not create dead ends

Chat and request screens should feel polished and consistent, not like utility screens.

---

## Shift / Business Manager Guidance

Some shift-management / business-manager functionality may already exist.
Treat that as an important product area, not disposable code.

Potential babysitter-side business features include:
- logged shifts
- hours worked
- total income
- date/time history
- monthly summaries
- calendar-like management
- lightweight business dashboard behavior

Rules:
- inspect existing implementation before changing it
- preserve existing useful logic where possible
- avoid rebuilding this area from scratch unless necessary
- if expanding it, do so in small safe chunks
- keep its UI consistent with the rest of the app

---

## UI Cleanup Priorities

When asked to polish the app, prioritize in this order:

1. shared spacing, typography, cards, buttons, inputs
2. form consistency
3. top bar / drawer / bottom navigation consistency
4. parent and babysitter mode visual coherence
5. removal of redundancy and clutter
6. empty / loading / success / error state polish
7. profile and dashboard polish
8. shift/business-manager polish if relevant to the task

---

## Known Risk Areas

Be extra careful around:
- oversized shared contexts
- request state transitions
- conversation creation
- role entry logic after login
- hidden or duplicate navigation paths
- onboarding vs edit-profile duplication
- partial UI migrations where old and new styles coexist
- parent/babysitter ID confusion
- shift-management/business-manager code that may already exist but be partially integrated

---

## Release Quality Expectations

Before considering a task complete, check:
- no obvious broken states
- no visible placeholder UI
- no duplicate actions introduced
- no stale in-app role switching
- RTL still feels correct
- parent mode and babysitter mode still feel like one app
- forms remain usable and visually consistent
- existing shift-management behavior was not broken if touched
- new UI feels production-ready, not experimental

---

## Expected Response Style for Repo Work

When making changes:
- be concise
- be practical
- explain the real impact of the change
- list changed files clearly
- mention any migration changes explicitly
- avoid huge speculative plans unless asked
- prefer shippable improvements over theoretical perfection

---

## When in Doubt

If there is uncertainty:
- inspect more before editing
- prefer the smaller safe change
- preserve existing working logic
- favor consistency over novelty
- favor clarity over cleverness
- preserve existing shift-management/business-manager behavior unless the task is explicitly to change it