---
name: Marine Tactical Intelligence
colors:
  surface: '#0f1416'
  surface-dim: '#0f1416'
  surface-bright: '#343a3d'
  surface-container-lowest: '#090f11'
  surface-container-low: '#171c1f'
  surface-container: '#1b2023'
  surface-container-high: '#252b2d'
  surface-container-highest: '#303638'
  on-surface: '#dee3e6'
  on-surface-variant: '#c3c6cf'
  inverse-surface: '#dee3e6'
  inverse-on-surface: '#2c3134'
  outline: '#8d9199'
  outline-variant: '#43474e'
  surface-tint: '#aac9f4'
  primary: '#aac9f4'
  on-primary: '#0e3255'
  primary-container: '#1e3e62'
  on-primary-container: '#8ba9d3'
  inverse-primary: '#426086'
  secondary: '#ffb596'
  on-secondary: '#581e00'
  secondary-container: '#fe6500'
  on-secondary-container: '#551c00'
  tertiary: '#7bd0ff'
  on-tertiary: '#00354a'
  tertiary-container: '#00425b'
  on-tertiary-container: '#26b3ee'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d3e4ff'
  primary-fixed-dim: '#aac9f4'
  on-primary-fixed: '#001c38'
  on-primary-fixed-variant: '#29486d'
  secondary-fixed: '#ffdbcd'
  secondary-fixed-dim: '#ffb596'
  on-secondary-fixed: '#360f00'
  on-secondary-fixed-variant: '#7d2d00'
  tertiary-fixed: '#c4e7ff'
  tertiary-fixed-dim: '#7bd0ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c69'
  background: '#0f1416'
  on-background: '#dee3e6'
  surface-variant: '#303638'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  container-max-width: 1440px
---

## Brand & Style
The design system is engineered for high-stakes marine environments, balancing the high-density requirements of a command center with the rugged, high-contrast needs of mobile field operations. The personality is authoritative, technical, and urgent.

The aesthetic fuses **Cyber-slate Glassmorphism** with **Technical Minimalism**. Desktop interfaces utilize semi-transparent, dark-slate surfaces to manage complex data layers without visual fatigue, while mobile interfaces prioritize "glanceability" through high-contrast elements and tactical borders. The emotional response is one of precision, safety, and absolute reliability under crisis.

## Colors
The palette is rooted in a **Deep Navy (#0B192C)** foundation to reduce eye strain in low-light bridge environments. 

- **Primary Ocean Blue (#1E3E62)**: Used for structural elements, navigation sidebars, and primary button containers.
- **Emergency Orange (#FF6500)**: Reserved for high-priority actions, critical alerts, and active tracking markers. It must be used sparingly to maintain its psychological impact.
- **Tech Cyan (#38BDF8)**: Applied to data visualizations, telemetry strings, and interactive "active" states to provide a futuristic, instrument-panel feel.
- **Arctic White (#F1F6F9)**: The primary text color, ensuring AAA accessibility against the deep background.
- **Crimson Red (#DC2626)**: Exclusively for system failures, hazardous weather warnings, and SOS triggers.

## Typography
This design system utilizes **Inter** exclusively to ensure maximum legibility across digital screens and ruggedized mobile displays. 

The type scale is dense, optimized for data-heavy dashboards. **Label-caps** are used for metadata and category headers to provide a structured, "instrument-cluster" appearance. For numerical data, coordinates, and telemetry, use the **mono-data** style which leverages Inter’s tabular font features to ensure numbers align vertically in data grids and status panels.

## Layout & Spacing
The layout follows a **Rigid Technical Grid** based on a 4px base unit. 

- **Desktop**: A 12-column fluid grid with fixed 16px gutters. Dashboards prioritize a "bento-box" arrangement where data modules are docked into a fixed-height viewport to prevent scrolling during critical monitoring.
- **Mobile**: A single-column layout with 16px side margins. Elements are sized for "gloved-hand" interaction, meaning touch targets for buttons and toggles are expanded to a minimum of 48px height despite the dense visual style.
- **Data Density**: Spacing between related data points should be tight (4px or 8px) to allow more information on-screen, while spacing between functional groups should be wider (24px+).

## Elevation & Depth
Depth is communicated through **Tonal Layering** and **Glassmorphism** rather than traditional heavy shadows.

1.  **Base Layer**: The Deep Navy (#0B192C) canvas.
2.  **Surface Layer**: Ocean Blue (#1E3E62) at 40% opacity with a 20px backdrop blur, creating a "cyber-slate" effect for cards and panels.
3.  **Raised Layer**: Solid Ocean Blue (#1E3E62) with a 1px inner stroke of Tech Cyan (#38BDF8) at 20% opacity. This is used for active modals or hovering states.
4.  **Technical Outlines**: All data containers utilize a 1px solid border (#F1F6F9 at 10% opacity) to define boundaries without adding visual bulk.

## Shapes
The shape language balances modern ergonomics with technical rigidity. 

- **Outer Containers**: Cards, modals, and main content areas use a **0.5rem (8px)** corner radius to soften the interface and feel approachable.
- **Technical Elements**: Input fields, data cells, and status indicators use a strict **2px** radius or sharp corners to denote precision and a "machine-made" quality.
- **Action Elements**: Buttons and primary navigation items use the standard 8px radius for tactile comfort.

## Components
- **Buttons**: Primary buttons use a solid Emergency Orange (#FF6500) background with Arctic White text. Secondary buttons are "Ghost" style with a Tech Cyan border.
- **Technical Cards**: Feature a 1px border and the cyber-slate blur effect. Headers within cards should have a subtle 1px bottom divider.
- **Status Chips**: Small, pill-shaped indicators. For "Normal," use Tech Cyan; for "Warning," use Emergency Orange; for "Critical," use Crimson Red. Text inside chips is always 12px bold.
- **Input Fields**: Dark backgrounds (#0B192C) with a persistent 1px border. On focus, the border glows with a 2px Tech Cyan outer stroke.
- **Data Visualization**: Graphs should use a Tech Cyan line with a subtle gradient fill below. Grid lines on maps and charts must be #F1F6F9 at 5% opacity.
- **Telemetry Lists**: High-density rows with alternating subtle background tints for readability. Each row should have a fixed height (32px or 40px) to maintain grid alignment.