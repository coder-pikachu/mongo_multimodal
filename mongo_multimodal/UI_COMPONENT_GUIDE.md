# UI Component Quick Reference Guide

A quick reference for using the new design system and component library.

---

## Quick Start

### Import Components
```tsx
import { Button, Card, Input, Modal, Badge } from '@/app/components/ui';
```

---

## Common Patterns

### Primary CTA Button
```tsx
<Button variant="primary" size="lg" leftIcon={<Plus />}>
  Create Project
</Button>
```

### Form with Validation
```tsx
<Input
  label="Email"
  type="email"
  error={errors.email}
  helperText="We'll never share your email"
  leftIcon={<Mail className="h-5 w-5" />}
  fullWidth
/>
```

### Feature Card
```tsx
<Card variant="elevated" hoverable padding="lg">
  <CardHeader>
    <CardTitle>Feature Name</CardTitle>
    <CardDescription>Brief description</CardDescription>
  </CardHeader>
  <CardContent>
    Main content here
  </CardContent>
</Card>
```

### Confirmation Dialog
```tsx
<ConfirmDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleDelete}
  title="Delete Project?"
  description="This action cannot be undone."
  confirmText="Delete"
  confirmVariant="danger"
/>
```

### Status Badge
```tsx
<Badge variant="success" dot>Active</Badge>
<Badge variant="warning" outline>Pending</Badge>
<Badge variant="error">Failed</Badge>
```

---

## Color Reference

### Semantic Colors
```tsx
// Primary (MongoDB Green)
bg-primary-500      // Main
bg-primary-600      // Hover
bg-primary-700      // Active

// Secondary (Blue)
bg-secondary-500    // Main
bg-secondary-600    // Hover

// Neutrals
bg-neutral-50       // Light background
bg-neutral-900      // Dark background
text-neutral-600    // Light mode text
text-neutral-400    // Dark mode text

// Status
bg-success-500      // Green
bg-warning-500      // Amber
bg-error-500        // Red
```

### Dark Mode
```tsx
className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50"
```

---

## Typography

### Headings
```tsx
// Hero
className="text-5xl md:text-6xl lg:text-7xl font-extrabold"

// Section Title
className="text-4xl md:text-5xl font-bold"

// Card Title
className="text-xl font-semibold"

// Body
className="text-base leading-relaxed"

// Caption
className="text-sm text-neutral-600 dark:text-neutral-400"
```

---

## Spacing

### Consistent Padding
```tsx
// Container
className="px-4 sm:px-6 lg:px-8 py-20"

// Card
className="p-6"

// Button
className="px-4 py-2.5"

// Gap
className="gap-4"
```

---

## Animations

### Entry Animations
```tsx
className="animate-fade-in"
className="animate-slide-in-up"
className="animate-scale-in"
```

### Staggered Animations
```tsx
<div className="animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
  Content
</div>
```

### Hover Effects
```tsx
// Scale
className="hover:scale-105 transition-transform"

// Glow
className="hover:shadow-glow-lg transition-shadow"

// Icon Movement
className="group-hover:translate-x-1 transition-transform"
```

---

## Responsive Design

### Breakpoints
```tsx
// Mobile first
className="text-base md:text-lg lg:text-xl"

// Grid
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"

// Visibility
className="hidden sm:flex"
```

---

## Accessibility

### Interactive Elements
```tsx
// Buttons
aria-label="Close dialog"

// Navigation
aria-current={isActive ? 'page' : undefined}

// Forms
aria-invalid={hasError ? 'true' : 'false'}
aria-describedby="error-message"

// Focus
className="focus:outline-none focus:ring-2 focus:ring-primary-500"
```

---

## Common Combinations

### Gradient Text
```tsx
className="bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-purple-500 text-transparent bg-clip-text"
```

### Glass Morphism
```tsx
className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl"
```

### Elevated Card
```tsx
className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
```

### Icon Button
```tsx
<button
  className="p-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
  aria-label="Settings"
>
  <Settings className="h-5 w-5" />
</button>
```

---

## Design Tokens Cheat Sheet

### Shadows
- `shadow-sm` - Subtle
- `shadow-md` - Standard
- `shadow-lg` - Prominent
- `shadow-xl` - High elevation
- `shadow-glow` - Primary glow

### Border Radius
- `rounded-lg` - Standard (0.75rem)
- `rounded-xl` - Large (1rem)
- `rounded-2xl` - Extra large (1.25rem)
- `rounded-3xl` - Super large (1.5rem)
- `rounded-full` - Pills/avatars

### Transitions
- `transition-colors` - Color changes
- `transition-all` - Everything
- `transition-transform` - Movements
- `duration-200` - Fast (200ms)
- `duration-300` - Standard (300ms)

---

## Migration Examples

### Old → New

#### Colors
```tsx
// OLD
className="bg-gray-100 dark:bg-zinc-800"
className="bg-[#00ED64]"

// NEW
className="bg-neutral-100 dark:bg-neutral-800"
className="bg-primary-500"
```

#### Buttons
```tsx
// OLD
<button className="px-4 py-2 bg-blue-500 text-white rounded">
  Click Me
</button>

// NEW
<Button variant="secondary" size="md">
  Click Me
</Button>
```

#### Cards
```tsx
// OLD
<div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
  Content
</div>

// NEW
<Card variant="default" padding="md">
  <CardContent>Content</CardContent>
</Card>
```

---

## Tips & Best Practices

1. **Always use semantic tokens** instead of arbitrary values
2. **Test dark mode** for every component
3. **Include aria-labels** on icon-only buttons
4. **Use the component library** for consistency
5. **Leverage Tailwind's JIT** - it compiles only what you use
6. **Mobile-first responsive** design approach
7. **Test keyboard navigation** for all interactive elements
8. **Maintain proper heading hierarchy** (h1 → h2 → h3)

---

## Need Help?

- **Full Documentation**: See [UI_UX_ENHANCEMENTS.md](UI_UX_ENHANCEMENTS.md:1)
- **Design Tokens**: Check [tailwind.config.ts](tailwind.config.ts:1)
- **Components**: Browse [app/components/ui/](app/components/ui/)
- **Examples**: View [app/page.tsx](app/page.tsx:1) and [app/components/Navigation.tsx](app/components/Navigation.tsx:1)

---

**Quick Reference Version**: 1.0
**Last Updated**: 2025-11-12
