# Restaurant Frontend Design System

Source of truth for visual design across the Angular app. Follow this for current screens and all future UI work so the product stays symmetrical and on-brand.

## Brand direction

Warm hospitality software — not corporate blue SaaS and not generic purple AI UI.

- **Primary accent:** restaurant orange (`--color-accent`)
- **Structure:** deep warm charcoal / espresso for chrome; soft warm-grey canvas for content
- **Personality:** appetizing, clear, fast for cashiers; professional for managers

## Design tokens (CSS variables)

Defined globally in `src/styles.scss` under `:root`. Prefer variables over hard-coded hex in feature SCSS.

| Token | Role |
|--------|------|
| `--color-accent` | Primary actions, active nav, focus, login CTA |
| `--color-accent-hover` | Hover/pressed accent |
| `--color-accent-soft` | Soft fills (active row, chips) |
| `--color-ink` | Primary text |
| `--color-ink-muted` | Secondary / helper text |
| `--color-surface` | Cards, panels, sidebar |
| `--color-canvas` | App shell content background |
| `--color-border` | Hairlines, table borders |
| `--color-brand-deep` | Login left panel / topbar depth |
| `--radius-sm` / `--radius-md` / `--radius-lg` | 8 / 12 / 16 px |
| `--space-1` … `--space-6` | 4 / 8 / 12 / 16 / 24 / 32 px |
| `--shadow-card` | Elevated cards/forms |
| `--font-display` | Headings / brand moments |
| `--font-body` | UI body copy |

## Typography

- **Display / brand:** `Fraunces` (serif) — login hero, major titles
- **Body / UI:** `Outfit` (sans) — forms, nav, tables, buttons
- Do **not** introduce Inter, Roboto, Arial, or system-ui as the primary stack
- Title hierarchy: one clear H1 per page; section labels uppercase + tracked for nav groups

## Layout & symmetry

- Shell: sticky topbar + fixed-width sidebar + fluid content. Keep vertical rhythm with `--space-*`.
- Content panels (`.panel` pattern): white/surface card, `--radius-lg`, consistent padding (`--space-5`).
- Forms: aligned columns, same field gap (`--space-3` / `--space-4`), full-width primary CTA in auth.
- Tables: consistent cell padding, header background `--color-canvas`, no mixed card+table chrome in one block without reason.
- Nav section headers share one height/padding; links share one row height; active state = left accent bar + soft fill (same for all sections).

## Color usage

- Orange for: primary buttons, active nav, focus rings, login accent strip, brand highlights
- Do not flood large backgrounds with solid orange — use deep charcoal + orange accents
- Canvas: soft warm grey (not pure white app chrome)
- Errors: keep semantic red; success green — do not recolor with orange

## Login

Split composition (desktop):

1. **Left brand plane** — full-bleed atmospheric panel; brand name as hero; short supporting line; orange accent
2. **Right form plane** — light surface; single auth card; restaurant / username / password; Change Password link; Sign in CTA

Mobile: stack brand (compact) above form. Keep fields and auth flow unchanged.

## Favicon

No branded favicon yet — `index.html` uses an empty data icon so the Angular default does not show. When a custom icon is provided, place it under `public/` and point `<link rel="icon">` at it.

## Footer

Shared `app-footer` on shell and login:

`© 2025–{currentYear} Codebase Solutions. All Rights Reserved. | Powered by Codebase Solutions`

Every “Codebase Solutions” links to `https://codebasesln.com` (new tab).

## Shell / navigation

- Topbar: brand (restaurant name), user meta, Change Password, Logout — aligned, not overcrowded
- Sidebar groups: **Sales**, **Inventory**, **Admin** — each group header is a **toggle** (expand/collapse)
- Sales link order (fixed):
  1. Dashboard  
  2. Categories  
  3. Menu Items  
  4. Sales Reports  
  5. POS  
- Inventory / Admin keep logical CRUD → reports order
- Active route: accent indicator + soft background; never rely on color alone without shape/weight

## Components

- Prefer outline Material fields for forms
- Primary action: filled accent button; secondary: stroked
- Confirm deletes via existing confirm dialog
- Report filters sit above tabs/tables; KPI cards above report tabs when shared

## Motion

Use short, purposeful motion only:

- Nav section expand/collapse (~200ms)
- Login card/fade entrance (subtle)
- Tab content already Material-driven

Avoid noise: no continuous glow pulses, no bouncing badges.

## Do / Don’t

**Do**

- Reuse tokens from `:root`
- Keep one composition per viewport (login, heroes)
- Match spacing to the scale above for new pages

**Don’t**

- Purple-on-white / indigo gradient themes
- Cream + terracotta “AI default” pairing as a new competing system
- Flat single-color full-page backgrounds with no atmosphere on branded surfaces
- Random radii/shadows per page
- Put POS above Dashboard / menu items in Sales

## Future work

When adding screens: start from tokens + shell patterns in this doc; extend tokens only if a new semantic need appears (document it here).
