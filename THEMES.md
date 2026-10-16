# Design System & Theme Specification

A comprehensive design token catalog and cross-application harmonisation guide based on Apple Human Interface Guidelines (HIG), Ableton Live theme swatches, and architectural glassmorphism materials.

---

## 1. Core Token Contract

Every theme implements the following CSS custom property specification. To bring this theme engine to other web applications, implement this exact token interface:

```css
:root {
  /* Canvas & Elevation */
  --bg-color: #f2f2f7;          /* Root application canvas */
  --surface-color: #ffffff;     /* Default cards & containers */
  --surface-opaque: #ffffff;    /* 100% opaque backing for sticky headers/columns */
  --surface-elevated: #ffffff;  /* Modals, popovers, and elevated sheets */
  --nav-bg: rgba(255, 255, 255, 0.85); /* Sticky headers & bottom bars */
  --segment-bg: #e3e3e8;        /* Segmented control track background */
  --tray-bg: #f9f9f9;           /* Secondary tray / inset panel background */
  --static-cell-bg: #f9f9f9;    /* Read-only / static slot fill */

  /* Typography */
  --text-primary: #1c1c1e;      /* Primary readable content */
  --text-secondary: #8e8e93;    /* Subtitles, labels, hints, and icons */
  --font-stack: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

  /* Structural Dividers */
  --border-color: #e5e5ea;      /* Card & table hairline divider */
  --handle-color: #c7c7cc;      /* Sheet grab handles & thumb indicators */

  /* Semantic System Accents */
  --accent-blue: #007aff;       /* Primary action, focus rings, info */
  --accent-red: #ff3b30;        /* Absent, destructive, danger */
  --accent-pink: #ff2d55;       /* Needs coverage, urgent alerts */
  --accent-green: #34c759;      /* Present, covered, success */
  --accent-yellow: #f59e0b;     /* Warning, pending approval, AC badge */
  --accent-purple: #8b5cf6;     /* Officiating CT, coordinator badges */

  /* Status States */
  --bg-assigned: #e5f0ff;       /* Active scheduled assignment */
  --bg-missing: #fff0f5;        /* Vacant / unassigned / absent */
  --bg-resolved: #f0fff4;       /* Covered / resolved substitution */
  --bg-absent-assigned: #fce4e4;/* Teacher absent while assigned */
  --drag-over-bg: #d1ffd6;      /* Drop target highlight */
  --toast-bg: #333333;          /* HUD toast background */

  /* Tactile Physics */
  --shadow-soft: 0 4px 14px rgba(0, 0, 0, 0.05);
  --radius-lg: 16px;
  --radius-md: 10px;
  --radius-sm: 6px;
}
```

---

## 2. Theme Catalog (12 Curated Themes)

The themes are organized into **4 curated design families**:
1. ☀️ **Minimalist Day / Light Modes**
2. 🌙 **Minimalist Night / Dark Modes**
3. 🪟 **Glass Materials & Refraction**
4. 🔲 **Studio & Accessibility**

---

### Family 1: ☀️ Minimalist Day / Light Modes

#### 1. System Auto (`system`)
- **Family**: Light / Auto
- **Philosophy**: Respects user OS preference dynamically via `@media (prefers-color-scheme: dark)`.
- **Best Use Case**: Default app startup setting.
- **Visuals**: Seamlessly matches Apple macOS / iOS system dark and light modes with zero user intervention.

#### 2. iOS Light (`light`)
- **Key**: `[data-theme="light"]`
- **Family**: ☀️ Light
- **Philosophy**: Cupertino Apple HIG Day palette. High-clarity, low eye-fatigue interface on pure white cards against soft light-gray canvas.
- **Best Use Case**: Daily standard classroom daytime front desk administration.
- **Palette**:
  | Token | Hex / Value | Description |
  |---|---|---|
  | `--bg-color` | `#f2f2f7` | SystemGray6 canvas |
  | `--surface-color` | `#ffffff` | Pure white cards |
  | `--surface-opaque` | `#ffffff` | Solid sticky column backing |
  | `--surface-elevated`| `#ffffff` | Sheet modal surface |
  | `--text-primary` | `#1c1c1e` | Deep charcoal |
  | `--text-secondary` | `#8e8e93` | SystemGray |
  | `--border-color` | `#e5e5ea` | SystemGray5 hairline |
  | `--accent-blue` | `#007aff` | Classic Apple Blue |
  | `--accent-green`| `#34c759` | Apple Success Green |
  | `--accent-red` | `#ff3b30` | Apple Crimson Red |
  | `--accent-pink` | `#ff2d55` | Vibrant Coral Pink |

#### 3. Warm Sepia (`warm-sepia`)
- **Key**: `[data-theme="warm-sepia"]`
- **Family**: ☀️ Light
- **Philosophy**: Organic warm daylight palette inspired by parchment, premium stationery, and reading e-paper. Eliminates blue light fatigue during prolonged screen use.
- **Best Use Case**: Extended timetable scheduling sessions and reading-heavy tasks.
- **Palette**:
  | Token | Hex / Value | Description |
  |---|---|---|
  | `--bg-color` | `#f5f0e6` | Natural linen canvas |
  | `--surface-color` | `#fdfbf7` | Warm ivory paper surface |
  | `--surface-opaque` | `#fdfbf7` | Solid warm backing |
  | `--surface-elevated`| `#ffffff` | Elevated ivory modal |
  | `--text-primary` | `#2d261e` | Espresso roast text |
  | `--text-secondary` | `#8a7e72` | Warm walnut gray |
  | `--border-color` | `#e4dacb` | Soft flax border |
  | `--accent-blue` | `#2c6ecb` | Royal Mediterranean Blue |
  | `--accent-green`| `#2e9b4d` | Sage Forest Green |
  | `--accent-red` | `#d9483b` | Terracotta Brick Red |
  | `--accent-pink` | `#db4468` | Rosewood Pink |

---

### Family 2: 🌙 Minimalist Night / Dark Modes

#### 4. iOS Dark (`dark`)
- **Key**: `[data-theme="dark"]`
- **Family**: 🌙 Dark
- **Philosophy**: Standard Apple iOS dark mode with desaturated semantic colors for dark-surface legibility and zero glare.
- **Best Use Case**: Dim lighting environments and general dark mode usage.
- **Palette**:
  | Token | Hex / Value | Description |
  |---|---|---|
  | `--bg-color` | `#000000` | Pure Black canvas |
  | `--surface-color` | `#1c1c1e` | SystemGray6 Dark card |
  | `--surface-opaque` | `#1c1c1e` | Opaque dark backing |
  | `--surface-elevated`| `#2c2c2e` | SystemGray5 Dark elevated |
  | `--text-primary` | `#f2f2f7` | Crisp light text |
  | `--text-secondary` | `#aeaeb2` | SystemGray Dark |
  | `--border-color` | `#38383a` | SystemGray4 Dark border |
  | `--accent-blue` | `#0a84ff` | Desaturated Sky Blue |
  | `--accent-green`| `#30d158` | Vivid Mint Green |
  | `--accent-red` | `#ff453a` | Luminous Coral Red |
  | `--accent-pink` | `#ff375f` | Bright Cerise Pink |

#### 5. Midnight OLED (`midnight`)
- **Key**: `[data-theme="midnight"]`
- **Family**: 🌙 Dark
- **Philosophy**: True black (`#000000`) designed for OLED and AMOLED displays. Pixels physically turn off, maximizing battery life and eliminating halo bloom.
- **Best Use Case**: Mobile smartphones, evening administrative shifts, and battery saving.
- **Palette**:
  | Token | Hex / Value | Description |
  |---|---|---|
  | `--bg-color` | `#000000` | True Pitch Black |
  | `--surface-color` | `#0b0c0e` | Obsidian card floor |
  | `--surface-opaque` | `#0b0c0e` | Solid dark backing |
  | `--surface-elevated`| `#14161a` | Elevated dark charcoal |
  | `--text-primary` | `#f5f7fa` | Ice White text |
  | `--text-secondary` | `#7f8694` | Neutral slate |
  | `--border-color` | `#1f232b` | Razor dark border |
  | `--accent-blue` | `#3b82f6` | High-chroma Blue |
  | `--accent-green`| `#10b981` | Emerald Green |
  | `--accent-red` | `#ef4444` | Vivid Crimson |
  | `--accent-pink` | `#f43f5e` | Punch Pink |

#### 6. Slate Nord (`slate-nord`)
- **Key**: `[data-theme="slate-nord"]`
- **Family**: 🌙 Dark
- **Philosophy**: Inspired by the arctic Scandinavian Nord color palette. Uses muted, low-contrast cool blue-gray tones that reduce cognitive fatigue.
- **Best Use Case**: Developers, technical operators, and multi-monitor setups.
- **Palette**:
  | Token | Hex / Value | Description |
  |---|---|---|
  | `--bg-color` | `#242933` | Polar Night Deep canvas |
  | `--surface-color` | `#2e3440` | Polar Night Card |
  | `--surface-opaque` | `#2e3440` | Solid polar backing |
  | `--surface-elevated`| `#3b4252` | Polar Night Elevated |
  | `--text-primary` | `#eceff4` | Snow Storm White |
  | `--text-secondary` | `#d8dee9` | Snow Storm Muted |
  | `--border-color` | `#434c5e` | Frost border |
  | `--accent-blue` | `#88c0d0` | Frost Cyan Blue |
  | `--accent-green`| `#a3be8c` | Aurora Moss Green |
  | `--accent-red` | `#bf616a` | Aurora Rust Red |
  | `--accent-pink` | `#d08770` | Aurora Peach Pink |

---

### Family 3: 🪟 Glass Materials & Refraction

#### 7. Utopian Glass (`utopian-glass`)
- **Key**: `[data-theme="utopian-glass"]`
- **Family**: 🪟 Glass Materials
- **Philosophy**: Minimalist surreal architectural glass inspired by utopian futuristic cityscapes (e.g. Divergent / Insurgent aesthetic). Triple radial ambient background gradients with prismatic glass refraction.
- **Best Use Case**: Premium modern displays, showcase dashboards, and visual presentations.
- **Material Formula**:
  - **Canvas**: Triple radial ambient glow (`#f0f9ff` base with blue/cyan/violet specular highlights).
  - **Surfaces**: `rgba(255, 255, 255, 0.65)` with `backdrop-filter: blur(28px) saturate(210%)`.
  - **Borders**: Dual specular rim highlights (`inset 0 1.5px 1px rgba(255, 255, 255, 0.95)`).
  - **Shadows**: Soft cyan ambient glow (`0 16px 40px -4px rgba(14, 165, 233, 0.14)`).

#### 8. Utopian Night (`utopian-night`)
- **Key**: `[data-theme="utopian-night"]`
- **Family**: 🪟 Glass Materials
- **Philosophy**: Deep obsidian space glass with electric cyan neon accents and frosted refractive surfaces.
- **Best Use Case**: Modern dark UI dashboards with vivid accent luminescence.
- **Material Formula**:
  - **Canvas**: `#040811` deep space navy obsidian.
  - **Surfaces**: `rgba(9, 18, 34, 0.76)` with `backdrop-filter: blur(28px) saturate(200%)`.
  - **Accents**: Cyan `#00e5ff`, Emerald `#10b981`, Amber `#f59e0b`.
  - **Glow**: Subtle cyan ambient drop shadow (`0 0 24px rgba(0, 229, 255, 0.08)`).

#### 9. Aero Frost (`aero-frost`)
- **Key**: `[data-theme="aero-frost"]`
- **Family**: 🪟 Glass Materials
- **Philosophy**: Liquid glass and frosted acrylic aesthetic inspired by Apple VisionOS materials and Windows Aero Glass.
- **Best Use Case**: Clean desktop workstations and fluid touch devices.
- **Material Formula**:
  - **Canvas**: `#e8eef5` cool fog canvas.
  - **Surfaces**: `rgba(255, 255, 255, 0.68)` with `backdrop-filter: blur(24px)`.
  - **Borders**: Translucent frosted rim (`border: 1px solid rgba(255, 255, 255, 0.8)`).
  - **Accents**: Cobalt Blue `#2563eb`, Scarlet Red `#dc2626`.

#### 10. Cyber Glass (`cyber-glass`)
- **Key**: `[data-theme="cyber-glass"]`
- **Family**: 🪟 Glass Materials
- **Philosophy**: Smoked dark-tinted glass paneling with bright cyber-luminescent neon indicators.
- **Best Use Case**: Technical control panels, operations cockpits, and evening front desk use.
- **Material Formula**:
  - **Canvas**: Deep petroleum `#090d16`.
  - **Surfaces**: `rgba(18, 24, 38, 0.7)` with `backdrop-filter: blur(24px)`.
  - **Borders**: Neon Cyan hairline (`rgba(56, 189, 248, 0.25)`).
  - **Accents**: Neon Cyan `#38bdf8`, Rose `#fb7185`, Mint `#34d399`.

#### 11. Retro Glass (`retro-glass`)
- **Key**: `[data-theme="retro-glass"]`
- **Family**: 🪟 Glass Materials
- **Philosophy**: Vintage 1980s high-end calculator and synthesizer glass buttons. Subtle skeuomorphic top-sheen lustre and tactile button depth.
- **Best Use Case**: Audio tools, hardware controllers, and retro computing apps.
- **Material Formula**:
  - **Canvas**: Dark graphite `#1a1c23`.
  - **Surfaces**: `rgba(35, 39, 49, 0.9)` with top-edge specular gradient.
  - **Borders**: `inset 0 1px 1px rgba(255, 255, 255, 0.25)`.
  - **Accents**: Ice Blue `#4ea8de`, Hot Coral `#ff5a5f`.

---

### Family 4: 🔲 Studio & Accessibility

#### 12. High Contrast Studio (`high-contrast`)
- **Key**: `[data-theme="high-contrast"]`
- **Family**: 🔲 Studio
- **Philosophy**: Ultra-crisp monochrome black-and-white schema. Eliminates all gradients, shadows, and translucency in favor of 100% solid borders and WCAG AAA contrast ratios.
- **Best Use Case**: Overhead classroom projectors, sunlight readability, and vision accessibility.
- **Palette**:
  | Token | Hex / Value | Description |
  |---|---|---|
  | `--bg-color` | `#ffffff` | 100% Solid White canvas |
  | `--surface-color` | `#ffffff` | Pure white cards |
  | `--surface-opaque` | `#ffffff` | Solid opaque backing |
  | `--text-primary` | `#000000` | 100% Pure Black text |
  | `--text-secondary` | `#333333` | Deep Charcoal secondary |
  | `--border-color` | `#000000` | 1px Solid Black borders |
  | `--accent-blue` | `#0044cc` | Deep Contrast Cobalt |
  | `--accent-green`| `#008800` | High-contrast Green |
  | `--accent-red` | `#cc0000` | Pure High-contrast Red |
  | `--accent-pink` | `#b8006d` | Magenta Accent |
  | `--handle-color`| `#000000` | Solid Black |

---

## 3. Cross-Application Harmonisation Code

### Drop-in JavaScript Theme Controller
Use this lightweight, zero-dependency controller in any web app to persist theme preference, listen to OS media queries, and swap styles:

```javascript
class ThemeManager {
  constructor(storageKey = 'app_theme_preference') {
    this.storageKey = storageKey;
    this.activeTheme = localStorage.getItem(this.storageKey) || 'system';
    this.init();
  }

  init() {
    this.applyTheme(this.activeTheme);
    
    // Listen for operating system theme changes when set to 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', () => {
        if (this.activeTheme === 'system') {
          this.applyTheme('system');
        }
      });
    }
  }

  setTheme(themeKey) {
    this.activeTheme = themeKey;
    localStorage.setItem(this.storageKey, themeKey);
    this.applyTheme(themeKey);
  }

  applyTheme(themeKey) {
    const root = document.documentElement;
    const body = document.body;

    if (themeKey === 'system') {
      root.removeAttribute('data-theme');
      body.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', themeKey);
      body.setAttribute('data-theme', themeKey);
    }

    // Dispatch event for UI components to synchronize active pills/swatches
    window.dispatchEvent(new CustomEvent('themechanged', { detail: { theme: themeKey } }));
  }
}

// Global instance
window.themeManager = new ThemeManager();
```

---

## 4. Harmonisation Checklist for Sibling Applications

When styling new applications or tools in the ecosystem:
- [ ] **Import Token Root**: Link the token contract CSS so all base elements read `--bg-color`, `--surface-color`, and `--text-primary`.
- [ ] **Apply Opaque Sticky Backing**: Always set sticky headers, sidebars, and frozen table columns to `background: var(--surface-opaque)` to prevent scrolling items from showing through.
- [ ] **Respect Semantic Accents**:
  - Always use `--accent-blue` for primary CTA buttons and active tab selections.
  - Always use `--accent-green` for confirmed/present states.
  - Always use `--accent-red` for absences, conflicts, and deletions.
  - Always use `--accent-purple` for special roles, coordinators, or officiating leads.
- [ ] **Use Standard Border Radii**:
  - `var(--radius-lg)` (16px) for cards, popovers, and dialogs.
  - `var(--radius-md)` (10px) for input fields, buttons, and chips.
  - `var(--radius-sm)` (6px) for badges and inner slot cells.
- [ ] **Preserve Glassmorphism Fallback**: On browsers without `backdrop-filter` support, ensure `--surface-color` provides acceptable opacity for text contrast.
