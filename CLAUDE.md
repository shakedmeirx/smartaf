# CLAUDE.md

## Project
Smartaf is a Hebrew-first, full-RTL, mobile-first childcare / babysitter marketplace and work-management app built with Expo React Native.

This is a real product codebase, not a prototype.

## Core product truth
There are 2 main roles:
1. Parent
2. Babysitter

Both roles must feel like one product, not two separate apps.

Role tone:
- Parent mode = softer, discovery-oriented, reassuring
- Babysitter mode = slightly more professional, dashboard/work oriented
- both must still share one unified Smartaf design language

## Source-of-truth rules
- **Stitch is the visual/design source of truth**
- **The existing Expo app is the logic/data/behavior source of truth**

That means:
- preserve the real app’s fields, logic, validation, navigation, and behavior
- do not remove real features because Stitch is simpler
- if the real app has more data than Stitch, keep it and fit it into the Stitch layout/style as cleanly as possible
- do not invent fake content, fake features, or fake product structure

## Required workflow
For any UI work:

1. Inspect the real app first
2. Inspect the matching Stitch screen(s) through MCP/skills
3. Use Stitch as the exact visual source of truth
4. Implement the visual layer as closely as possible
5. Preserve the app’s real logic and behavior
6. Stop after each safe chunk so the result can be tested

## Stitch usage rules
- Actively use Stitch MCP and Stitch skills/tools
- Use Stitch skills to inspect:
  - exact screen layouts
  - exact design tokens
  - exact card/button/input patterns
  - exact branding/logo usage
  - exact assets/images/logo references when available
- Treat Stitch skills as the **first place to look** before making visual decisions
- Do not guess if Stitch can provide the answer
- If Stitch cannot provide enough detail, say exactly what is missing

## Design goals
The final app should feel:
- cohesive
- premium
- calm
- polished
- warm
- trustworthy
- production-ready

The final app must have:
- one consistent design system
- one consistent shell
- one consistent header/top bar language
- one consistent bottom navigation language
- one consistent card system
- one consistent button system
- one consistent input system
- one consistent empty-state system
- one consistent logo/brand treatment

## Brand rules
App name: **Smartaf**

Brand consistency rules:
- use the same Smartaf logo/brand treatment across the app
- keep app name spelling consistent
- keep brand colors consistent
- keep brand placement logic consistent
- avoid inconsistent branding across screens

## Styling rules
- Hebrew-first
- full RTL
- mobile-first
- soft pale blue / blue-lavender backgrounds
- rounded white cards
- deep navy text
- purple gradient primary CTA
- pale lavender / pale blue secondary surfaces
- soft shadows
- rounded avatars and icon holders
- airy spacing
- no harsh borders
- clean, premium hierarchy

## Safety rules
- no backend/schema changes unless absolutely necessary
- no broad blind rewrites
- no unrelated refactors
- do not break auth
- do not break onboarding
- do not break role behavior
- do not break requests
- do not break chats
- do not break posts
- do not break ratings
- do not break notifications
- do not break shift-management/dashboard/availability
- preserve image upload/edit/remove behavior where it exists

## Implementation rules
- prefer small safe chunks
- prefer shared primitives before large screen rewrites
- reuse existing logic
- replace old visual patterns when they conflict with Stitch
- do not keep outdated UI patterns just because they are already in the codebase

## Screen replication mode
Unless explicitly told otherwise, operate in **strict screen replication mode**:

- use one exact Stitch screen as the visual source of truth
- use one exact app screen/file as the implementation target
- match Stitch as closely as possible visually
- do not “take inspiration”
- do not redesign in your own style
- preserve the existing app’s behavior

## Sidebar temporary compatibility rule
If a Stitch screen requires a setup or flow that cannot safely replace the current in-app structure yet:
- do not break the current product flow
- temporarily add/expose that Stitch-designed screen through the sidebar/drawer
- clearly explain which screens were added there and why
- use this as a temporary compatibility path only

## Planning rules
Before significant UI changes, provide:
- what is already implemented
- what still differs from Stitch
- which exact Stitch screens are being used
- which files will change
- what must remain untouched
- what should be tested afterward

## Reporting rules
After each implementation chunk, report:
- exact files changed
- exact Stitch screens used
- exact Stitch skills/tools used
- exact assets/images/logo references used
- what was matched closely
- what still differs and why
- manual test checklist
- whether anything was added to the sidebar temporarily

## Preferred rollout order
1. shared theme/tokens
2. shared primitives/components
3. auth screens
4. onboarding screens
5. parent discovery
6. babysitter profile
7. parent profile
8. requests
9. chats
10. posts
11. favorites/saved
12. ratings/reviews
13. dashboard / shifts / availability
14. settings / drawer
15. empty states / final polish

## Never do
- do not invent fake product features
- do not invent fake dashboard metrics
- do not drop real app fields silently
- do not change logic because a design is simpler
- do not rewrite the whole app at once
- do not proceed with a huge multi-screen rewrite without a phased plan

## Default execution behavior
When asked to implement design:
1. inspect app
2. inspect Stitch
3. compare
4. plan safe chunk
5. implement one chunk
6. stop