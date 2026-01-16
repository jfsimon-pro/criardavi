---
trigger: always_on
---

Before creating any component, make sure that:

Project Design System & UX Rules
This document establishes the mandatory design system for the project. All future UI implementation MUST adhere to these guidelines to maintain the "Modern Clean SaaS" aesthetic.

1. Core UX Philosophy
"Airy & Floating": The UI should feel light. Use white cards on a light gray background (#F3F5F7). Do NOT place content directly on the gray background without a container.
Soft & Friendly: Use generous border radiuses (20px for cards, pill shapes for buttons/inputs). Avoid sharp corners.
Clean Hierarchy: Use whitespace to separate content. Do not use heavy borders. Use separate text colors (Dark Slate vs Cool Gray) to distinguish headings from metadata.
2. Color Palette (Strict)
Use the defined CSS Variables in 
globals.css
.

Variable	Hex	Usage
--primary-blue	#2563EB	Primary Action Color. Active states, main buttons, key data.
--bg-page	#F3F5F7	Page Background. NEVER use white for the full page background.
--bg-card	#FFFFFF	Component Background. All widgets/sections must be white.
--text-heading	#1E293B	Headings / Values. (Slate-800). High contrast.
--text-body	#64748B	Metadata / Labels. (Slate-500). Lower contrast.
--success-green	#10B981	Positive trends, "Done" status.
--alert-red	#EF4444	Notification badges, critical alerts.
3. Typography
Font Family: Plus Jakarta Sans (configured in 
layout.tsx
).
Weights:
Bold (700): Main Headings, Stat Values, User Names.
Medium (500/600): Buttons, Navigation Links.
Regular (400): Body text, metadata.
4. Component Patterns
A. Cards
Background: White (#FFFFFF).
Border Radius: 20px (or var(--radius-card)).
Shadow: var(--shadow-card) (Subtle: 0 4px 6px -1px rgba(0,0,0,0.05)).
Padding: Minimum 24px.
B. Buttons & Inputs
Shape: Full Pill (border-radius: 9999px).
Primary Button: Solid Blue background, White text.
Icon Buttons: White circle background, subtle shadow. Hover effect: slight lift (translateY(-2px)).
Search Input: White background, no visible border (use shadow), placeholder text in Cool Gray.
C. Sidebar & Navigation
Layout: Fixed left sidebar.
Active Item:
Background: Primary Blue.
Text/Icon: White.
Shape: Pill (rounded ends).
Inactive Item: Transparent background, Dark Gray text. Hover: Light Blue tint.
D. Icons
Library: lucide-react.
Style: Line icons (stroke-width="2").
Size: Standard 20px. Consistent sizing is critical.
5. Implementation Checklist
When creating a new screen:

 Does it use the DashboardLayout structure?
 Is the background #F3F5F7?
 Are all content sections inside White Cards with 20px radius?
 Are excessive borders avoided in favor of soft shadows?
 Is the primary typeface Plus Jakarta Sans?
