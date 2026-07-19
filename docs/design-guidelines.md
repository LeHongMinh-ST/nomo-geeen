# Design Guidelines

The canonical frontend visual and interaction rules are in `DESIGN.md`. This document summarizes the rules most relevant to implementation review.

## Brand and surfaces

- Primary action: `#5CAD45`; hover `#4F9C3A`; active `#3F8530`.
- Admin module accents may use the FarmGo multi-tile palette, including tenant blue `#1E88E5`, billing purple `#7E57C2`, warning orange `#F4511E`, inventory indigo `#3949AB`, and admin slate `#546E7A`.
- App backgrounds, cards, headers, and sidebars are white or near-white; avoid dark full-height panels in the authenticated app.
- Typography: Be Vietnam Pro with Inter fallback; body content is normally at least 16px.

## Layout and interaction

- Mobile-first; minimum touch target is 48px.
- Use 4px spacing increments and the existing card/button radii from `DESIGN.md`.
- Data-dense tables must have a mobile card/list representation rather than forcing horizontal desktop columns.
- Use inline filters on desktop/mobile; use a bottom drawer on mobile when a filter group needs more room.
- Create/edit/detail flows use separate routes rather than modal dialogs.

## Accessibility

- Every icon-only control needs an accessible label.
- Preserve visible focus styles and keyboard reachability.
- Use semantic headings, buttons, links, form labels, and status text.
- Do not rely on color alone to communicate an audit action or warning.

## Admin activity screens

For a system activity log, prefer a readable event list/card on mobile and a compact table on desktop. Keep the primary event, actor, tenant, resource, and timestamp visible; put before/after details behind an explicit detail action. Mask secrets and avoid displaying raw authentication tokens or password material.

## Evidence

Detailed tokens, breakpoints, motion, and component rules remain in `DESIGN.md`; this summary must not diverge from it.
