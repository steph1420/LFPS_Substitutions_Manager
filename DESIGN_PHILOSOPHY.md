# Design Philosophy & Engineering Directives
*A portable manifesto for engineering Apple-grade, high-velocity digital products.*

> **To the AI Assistant or Engineer receiving this document:**
> This document defines the engineering standards, interface philosophy, performance criteria, and interaction heuristics expected across all features, components, and architectural decisions. Adopt these tenets uncompromisingly.

---

## 1. The Prime Directive: Best Strategies & Modern Standards First

- **Never Settle for Hacks**: Quick workarounds, brittle scripts, and short-sighted compromises accumulate insurmountable technical debt. Always select the architecturally superior, modern, industry-standard solution.
- **Design for the 10-Year Horizon**: Build modular, clean, and extensible systems that can scale into enterprise platforms or be embedded into larger suites without namespace collision or tight coupling.
- **Strict Type Safety & Immutability**:
  - Eliminate `any`. Every entity, state transition, and payload must have a strict, declarative TypeScript type or Go struct.
  - State mutations must be deterministic, pure, and testable in isolation.

---

## 2. Apple Human Interface Guidelines (HIG) & Physicality

### 2.1 The Materiality Principle
Digital interfaces should feel like tangible physical instruments. Elements must have mass, inertia, spring tension, and tactile resistance. When an element moves, it should not snap linearly; it should decelerate naturally with authentic spring physics.

### 2.2 Symmetrical, Unhurried Spring Transitions
- **Use Springs, Not Linear Timers**: Discard `ease-in-out` or linear timing curves. Use true damped harmonic oscillator spring physics (`type: 'spring'`).
- **Timing Symmetry**: An expand animation and a collapse animation must be timed with equal dignity. Never rush a collapse "as if it has a train to catch." If expanding takes 600ms, collapsing must take 600ms.
- **Spring Palette**:
  - **Snappy** (`stiffness: 450, damping: 32, mass: 0.8`): Pill toggles, micro-buttons, status badges.
  - **Smooth** (`stiffness: 260, damping: 28, mass: 1.2`): Slide-over sheets, full-height panels, console morphs.
  - **Fluid Dynamic Island** (`duration: 0.6s, bounce: 0.12`): Capsule expansions, shape deformations, and sticky-to-floating morphs.

### 2.3 Uncapped 120fps Hardware Compositing
- **Zero Layout Reflows**: Never animate CSS properties that trigger CPU reflow or geometry recalculations (`width`, `height`, `max-height`, `top`, `left`, `margin`, `padding`).
- **GPU Properties Only**: Animate strictly GPU-composited properties: `transform: translate3d(...) scale(...)` and `opacity`.
- **CSS Transition Guard**: Never apply CSS `transition: all` or `transition-transform` to elements managed by a JavaScript animation library (like Framer Motion). Doing so causes browser CSS transition engines to fight GPU spring interpolations, resulting in stuttering and lag.
- **Containing Block Vigilance**: Keep fixed backdrops and overlays outside elements with CSS `transform`, `filter`, or `perspective` to avoid WebKit containing block clipping traps.

---

## 3. Speed-of-Light "Front Desk Velocity" UX

### 3.1 Zero Travel Distance
Coordinators, dispatchers, and front-desk operators cannot afford wide mouse or hand travel across screens:
- Anchor micro-actions directly adjacent to the cursor or touch target using anchored context popovers rather than throwing full-screen dialogs across the viewport.
- Provide direct 1-tap toggles (`Mark Absent`, `Free from Sub`, `Assign Off. CT`) with zero intermediate confirmation dialogs for routine operations.

### 3.2 Non-Blocking Operations
- Never block operational flow with compulsory login walls or multi-step wizard forms.
- Guests and front-desk personnel must have instantaneous 0-second access to read, filter, inspect, and export data without logging in. Teacher logins should layer personalized conveniences (`My Subs`, personal accept/dispute actions) without locking baseline front-desk velocity.

### 3.3 Progressive Disclosure
- Present an ultra-clean, decluttered primary canvas that surfaces only the critical 20% of information needed for 80% of daily tasks.
- House power-user controls, deep diagnostic tools, and simulation sandboxes behind deliberate progressive disclosure (e.g. contextual right-click/long-press, or hidden Developer Options behind an Easter egg).

---

## 4. Architectural Separation of Concerns

Organize codebases as modular, loosely coupled layers:

```
┌────────────────────────────────────────────────────────┐
│            apps/web (React 19 Frontend)                │
│  UI Presentation • Framer Motion • Zustand Store       │
└──────────────────────────┬─────────────────────────────┘
                           │ (Optimistic Updates / WS)
┌──────────────────────────▼─────────────────────────────┐
│          apps/server (Go / Rust Backend)               │
│  Concurrent WS Hub • Disk Snapshots • Excelize Reports │
└──────────────────────────┬─────────────────────────────┘
                           │ (Strict Contracts)
┌──────────────────────────▼─────────────────────────────┐
│           packages/core (Domain Engine)                │
│  Pure TypeScript Solver • Immutable Schedules • Tests   │
└────────────────────────────────────────────────────────┘
```

1. **Pure Domain Core (`@lfps/core`)**: Zero dependencies on React, the DOM, or browser APIs. Pure algorithms, deterministic candidate ranking, conflict detectors, and data parsers covered by 100% unit tests.
2. **Design Tokens (`@lfps/ui`)**: Centralized physics curves, glass materials, and semantic role palettes shared across platforms.
3. **Reactive Presentation (`apps/web`)**: Lightweight unidirectional state store (e.g., Zustand) providing 0ms optimistic UI updates with background network broadcast.
4. **Compiled High-Concurrency Backend (`apps/server`)**: Sub-millisecond execution using Go or Rust with full-duplex WebSockets, thread-safe disk persistence, and automated report generation.

---

## 5. Visual Hierarchy & Color Semantics

- **Color is Functional State, Not Decoration**:
  - Every color must carry an unambiguous operational meaning. Never use color arbitrarily.
  - **Academic Coordinator (AC)**: Royal Violet (`#8b5cf6`) — Leadership & Master Oversight.
  - **Assistant Academic Coordinator (AAC)**: Royal Violet (`#8b5cf6`) — Aligned Leadership.
  - **Class Teachers (CT)**: Teal-Sky (`#0284c7`) — Homeroom Guardianship.
  - **Subject Teachers (ST)**: iOS Blue (`#007aff`) — Instructional Faculty.
  - **Present**: Emerald Green (`#10b981`) — Ready & On Duty.
  - **Absent**: Crimson Red (`#ff3b30`) — Urgent Substitution Required.
  - **Away (Official)**: Slate Indigo (`#475569`) — School Sanctioned Deputation.
- **Opaque Masking for Sticky Headers**:
  - Sticky table columns and sticky header consoles must use 100% solid, opaque backings (`bg-slate-950` / `#020617`) with ambient drop shadows. Never allow translucent scrolled content to bleed through underlying text.

---

## 6. Microcopy & Interaction Design

- **Concise, Punchy Microcopy**:
  - Eliminate verbose sentences in toast notifications, labels, and badges.
  - Condense messaging into 2–4 glanceable words (e.g., `Present` instead of `On Campus`, `Exit Fullscreen`, `Need Sub!`, `History Purged`).
- **Tactile Haptic Confirmation**:
  - Mobile interactions should emit subtle, non-intrusive haptic feedback (`navigator.vibrate(20)` for micro-taps, `navigator.vibrate([40, 50])` for long-press menus) to confirm user actions physically.

---

## 7. Operational Discipline & Documentation

1. **Living Architecture Blueprint (`ARCHITECTURE.md`)**: Maintain an authoritative document describing system topologies, package boundaries, data flows, and state synchronization lifecycles.
2. **Exhaustive Changelog (`CHANGELOG.md`)**: Follow [Keep a Changelog](https://keepachangelog.com/) standards. Document every bug fix, feature addition, and performance optimization with release dates and version tags.
3. **Structured Task Tracking (`TODO.md`)**: Maintain active, queued, and resolved bugs and features with explicit IDs (`BUG-XX`, `FEAT-XX`, `PERF-XX`) to preserve project momentum across development sessions.
