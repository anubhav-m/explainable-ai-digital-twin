---
name: Explainable AI Digital Twin
description: A patient's HbA1c estimate, printed as a registered proof with its reasons.
colors:
  sheet: "#f5f4f6"
  sheet-warm: "#faf6f5"
  sheet-cool: "#eef3ef"
  raised: "#fbfafb"
  ink: "#16181a"
  mute: "#5c5f63"
  hair: "#c9c7c4"
  seal: "#d5ebdd"
  status-normal: "#2f8f5b"
  status-prediabetes: "#d99a12"
  status-diabetes: "#c8321e"
  dark-sheet: "#121416"
  dark-sheet-warm: "#181513"
  dark-sheet-cool: "#111813"
  dark-raised: "#1a1c1f"
  dark-ink: "#ecebee"
  dark-mute: "#a3a6aa"
  dark-hair: "#34373a"
  dark-seal: "#20382b"
  dark-status-normal: "#4fb783"
  dark-status-prediabetes: "#e5b13a"
  dark-status-diabetes: "#ee6a55"
typography:
  display:
    fontFamily: "Schibsted Grotesk Variable, Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "5.75rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Schibsted Grotesk Variable, Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Schibsted Grotesk Variable, Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.4rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  figure:
    fontFamily: "Schibsted Grotesk Variable, Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.1rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Schibsted Grotesk Variable, Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.14em"
rounded:
  none: "0"
  full: "9999px"
spacing:
  plate: "28px"
  gap: "40px"
  section: "32px"
  bar: "72px"
  control: "44px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 18px"
    height: "44px"
  button-outline-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
  field:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "44px"
  status-tag:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "7px 12px"
  seal:
    backgroundColor: "{colors.seal}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: "112px"
---

# Design System: Explainable AI Digital Twin

## Overview

**Creative North Star: "The Plate Section"**

Each result is a plate on a near-white sheet, the way a design annual prints its work: registered at the corners with crosshairs, ruled with hairlines, set in one grotesque, and signed with a single pale green stamp. A health estimate presented this way reads as a printed proof someone checked, not as a dashboard widget. The sheet is never neutral: it drifts warm at the top left and green at the bottom right, so ink looks printed on it.

The system is nearly monochrome on purpose. Ink, hairline and sheet do the structural work; the three HbA1c status colours are the only saturation and always carry a label. Direction is drawn as shape, not colour: a filled bar pushes the estimate up, an outlined bar pulls it down. The dark theme inverts the same roles onto an ink-tinted near-black. Purple is ruled out by the user.

**Key Characteristics:**
- Plates without boxes: no card backgrounds, no card borders, no shadows on content.
- Zero radius on every rectangle; circles only for stamps, markers and icon buttons.
- One grotesque for display and body, one mono for labels and measurements.
- Status colour is the only saturated colour on the sheet.
- Patient language leads, the technical term sits beside it.

## Colors

An ink-on-paper palette with one pale stamp colour and three status signals.

### Primary
- **Ink** (`ink`): all text, rules that matter, filled buttons, filled bars, scale lines and markers. Never pure black.

### Secondary
- **Seal Green** (`seal`): the stamp, the active change in the what-if controls, the delta chip, the source-of-text tag and the fill of lab-result dots. It marks "this was touched or verified", never decoration.

### Tertiary
- **Status Normal / Prediabetes / Diabetes** (`status-normal`, `status-prediabetes`, `status-diabetes`): 9px squares in tags and legends and the 3px strip under the HbA1c scale. Nothing else.

### Neutral
- **Sheet** (`sheet`, with `sheet-warm` and `sheet-cool` at opposite corners): the page ground.
- **Raised** (`raised`): form field fill only.
- **Mute** (`mute`): secondary text, labels at rest, axis text.
- **Hair** (`hair`): 1px dividers, field borders, dot matrix, skeleton fill.

Each token has a `dark-` counterpart applied under the `.dark` class; roles do not change between themes.

### Named Rules
**The Signal Rule.** Saturated colour appears only as an HbA1c status, and always next to its words.
**The Shape-Not-Hue Rule.** Up and down are filled and outlined, either side of one centreline. Never red and blue.
**The No Purple Rule.** No violet, indigo or blue-to-purple gradient anywhere.

## Typography

**Display Font:** Schibsted Grotesk Variable (self-hosted, with system-ui fallback)
**Body Font:** Schibsted Grotesk Variable
**Label/Mono Font:** Geist Mono (self-hosted)

**Character:** One calm grotesque at regular weight does everything from the 92px estimate to body copy; hierarchy comes from size, not boldness. The mono is the measuring voice.

### Hierarchy
- **Display** (400, 5.75rem, 1): the estimate itself. One per screen.
- **Headline** (400, 2.5rem, 1.05): page titles.
- **Title** (400, 1.4rem, 1.25): plate headings.
- **Figure** (400, 2.1rem, 1.25): secondary numbers in the four-up row and equations.
- **Body** (400, 16px, 1.5): running text, capped near 62 to 70ch.
- **Label** (400, 11px, 0.14em, uppercase): nav tokens, field labels, tags, buttons (0.12em), chart text. Units inside a label keep their own casing.

### Named Rules
**The Regular Weight Rule.** Display and headings stay at 400. Weight 600 is for the product name and inline emphasis only.
**The Measuring Voice Rule.** Mono is for labels and for columns of measurements that must align. It is never a costume for "technical".

## Layout

A 1440px-max container with 56px side padding on large screens, 32px on tablets, 20px on phones. Screens are a 12-column grid with a 40px gap, usually split 5/7 or 8/4 between two plates, followed by full-width hairline-ruled rows. Plates carry 28px padding. A sticky 72px top bar holds the product name, six section tokens, two round icon buttons and the filled primary action; below 1360px the tokens drop to a horizontally scrolling second row. Below 1024px plates stack; below 640px the SHAP track moves to its own line under each row and the stamp is replaced by the same fact in the sentence.

Empty space inside a plate is filled with an 8px dot matrix rather than an illustration.

## Elevation & Depth

Flat. Depth is carried by registration, not shadow: crosshairs at two corners of every plate, and the stamp straddling a plate's top edge. The only shadow in the system belongs to the chart tooltip, which genuinely floats.

### Named Rules
**The Flat Sheet Rule.** Content never gets a shadow, a tinted card or a glass panel.

## Shapes

Every rectangle is square-cornered (0 radius): buttons, fields, tags, bars, tooltips. Circles are reserved for the stamp, scale and chart markers, slider thumbs and the two icon buttons. All rules are 1px. Crosshairs are 13px, drawn from two 1px strokes, sitting 6px outside the plate corner at top left and bottom right.

## Components

### Buttons
- **Shape:** square, 44px tall, 18px side padding, mono caps.
- **Primary:** ink fill, sheet text.
- **Hover / Focus:** fill and text invert in 0.1s; focus is a 1px ink outline offset 3px.
- **Outline:** the inverse; used for secondary actions and retry.

### Status tag
- **Style:** 1px ink border, mono caps, a 9px status square before the text.

### Plates
- **Corner Style:** square, registered by crosshairs.
- **Background:** none; the sheet shows through.
- **Border:** none. Internal structure comes from 1px hairlines.
- **Internal Padding:** 28px.
- **Motion:** on the first screen after load, plates step up 14px and fade in on `cubic-bezier(0.19, 1, 0.22, 1)`, 70ms apart, and their crosshairs snap on. After that, screens cross-fade in 0.2s. A plate that replaces its skeleton keeps its frame and fades only its contents.

### Inputs / Fields
- **Style:** square, 44px, 1px hair border, raised fill, 16px text.
- **Focus:** ink border doubled with an inset 1px ring.
- **Range:** a 1px ink track with a 17px ink circle thumb.

### Navigation
- **Style:** mono caps tokens; patient label in ink or mute, technical term after a middle dot in mute. The active token is ink with a 1px underline that draws from the left.

### Seal
A 112px pale green disc with a ring of mono text turning once every 25s around a fixed centre value. It states what kind of number the plate holds. It lifts 4px on hover.

### HbA1c scale
One 1px ink line on a fixed 4.5 to 7.5 domain, ticks at the two clinical thresholds, a 17px circle marker (hollow for "before"), a 3px status strip beneath and a wrapping legend. The same scale is used on every screen so readings compare by eye.

### SHAP rows
Hairline-ruled rows: input, your value, a centreline track, and the signed value in mono. Hovering one row dims the others on devices that hover.

### Skeleton
Hair-coloured square blocks with a slow shimmer, laid out to the loaded plate's dimensions, inside a real plate so the crosshairs are already in place.

## Do's and Don'ts

### Do:
- **Do** put every estimate next to its range, its typical error and the words "model estimate".
- **Do** use hairlines and crosshairs to structure a screen before reaching for a container.
- **Do** keep one HbA1c scale domain across screens.
- **Do** pair every patient label with its technical term where an evaluator would look for it.
- **Do** honour `prefers-reduced-motion`: the entrance, the shimmer and the turning seal all stop.

### Don't:
- **Don't** use purple, indigo, or gradient fills.
- **Don't** round a rectangle or add a shadow to content.
- **Don't** encode up and down, or good and bad, in colour alone.
- **Don't** replay the entrance on a tab change or count a health number up from a value the patient never had.
- **Don't** add icons as decoration beside headings.
