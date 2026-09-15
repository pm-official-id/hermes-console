# Hermes Console Canvas Design Handoff

This document records the visual exploration created in the Replit canvas so
the design can travel with the repository and be rebuilt by another agent.

## Source of truth

- Original production direction: `artifacts/hermes-console/src/App.tsx` and
  `artifacts/hermes-console/src/index.css`
- Canvas exploration source: `artifacts/mockup-sandbox/src/components/mockups/hermes/HermesOrbit.tsx`
- Canvas preview artifact: `artifacts/mockup-sandbox`

The original Hermes Console design remains the preferred production direction.
Hermes Orbit is an alternate route-first exploration and should not replace the
original console unless the product owner explicitly chooses it.

## Hermes Orbit visual direction

Hermes Orbit is a route-first operator console for a local AI stack. It is
intentionally quieter and more operational than a consumer dashboard.

### Layout

- Dark navy top bar with a compact Hermes mark and local-control-plane label.
- Primary views: Fleet, Routes, and Runtime.
- Secondary workspace bar with host scan and preferences actions.
- Large editorial hero statement that explains the operator value.
- Machine posture gauge beside the hero.
- Four machine summary metrics below the hero.
- Two-column working area:
  - Managed fleet list with search, service rows, CPU micro-bars, routes, and
    lifecycle actions.
  - Dark focused-service inspector with status, action, facts, container image,
    and route information.
- Routes and Runtime are alternate full-width views.
- Small live-telemetry toast in the lower-right corner.

### Visual language

- Warm off-white paper background, pale panels, and thin neutral borders.
- Deep navy for the command surface and focused-service inspector.
- Teal for healthy/live state and interaction accents.
- Orange, amber, and muted slate for service-specific status accents.
- Space Grotesk-style display typography, Manrope-style UI typography, and
  monospace metadata.
- Tight borders, restrained shadows, compact controls, and no decorative
  gradients.
- Responsive behavior collapses the inspector below the fleet, hides secondary
  telemetry columns on narrow screens, and exposes a compact mobile menu.

### Interaction behavior represented by the canvas

- Filter services by name, role, or route.
- Select a service to update the inspector.
- Start or pause a service from either the service row or inspector.
- Switch between Fleet, Routes, and Runtime.
- Scan the host and display an operator notice.
- Show empty search results without breaking the layout.

## Production translation rules

The canvas uses local seeded data only. When implementing the production
console:

1. Replace seeded service data with the generated control-plane API hooks.
2. Keep lifecycle operations explicit and audited: start, stop, and restart.
3. Treat telemetry and logs as server state; do not simulate successful
   mutations when the API rejects them.
4. Preserve the original Hermes Console brand and information architecture
   unless the product owner approves the Orbit direction.
5. Keep the canvas component as a reference implementation, not as a second
   production portal.