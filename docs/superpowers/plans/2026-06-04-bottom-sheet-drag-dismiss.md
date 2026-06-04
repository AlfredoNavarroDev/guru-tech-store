# BottomSheet Drag-to-Dismiss Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a reusable `<BottomSheet>` component with drag-to-dismiss (threshold: 30% of sheet height) and refactor existing mobile bottom sheets to use it.

**Architecture:** Pure behavior component — handles backdrop, entrance/exit animation, and drag. No visual opinions; children control bg/rounding/shadow. Two nested `motion.div`s: outer for entrance/exit, inner for drag. Scroll protection via capture listener disables drag when content is scrolled.

**Tech Stack:** `motion/react` (already installed), React hooks, Tailwind CSS.

---

### Task 1: Create `BottomSheet` component

**Files:**
- Create: `Frontend/components/ui/bottom-sheet.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client"

import * as React from "react"
import { motion, AnimatePresence, type PanInfo } from "motion/react"
import { cn } from "@/lib/utils"

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  disabled?: boolean
  className?: string
  wrapperClassName?: string
}

export function BottomSheet({
  open,
  onClose,
  children,
  disabled = false,
  className,
  wrapperClassName,
}: BottomSheetProps) {
  const sheetRef = React.useRef<HTMLDivElement>(null)
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)")
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  React.useEffect(() => {
    if (!open) {
      setIsScrolled(false)
      return
    }
    function handleScroll(e: Event) {
      const el = e.target as HTMLElement
      if (typeof el.scrollTop === "number") {
        setIsScrolled(el.scrollTop > 0)
      }
    }
    document.addEventListener("scroll", handleScroll, true)
    return () => document.removeEventListener("scroll", handleScroll, true)
  }, [open])

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const sheetHeight = sheetRef.current?.offsetHeight ?? 400
    if (info.offset.y > sheetHeight * 0.3) {
      onClose()
    }
  }

  const canDrag = isMobile && !isScrolled && !disabled

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bottom-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => !disabled && onClose()}
          />

          <motion.div
            key="bottom-sheet-wrapper"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ type: "spring", damping: 32, stiffness: 380 }}
            className={cn(
              "fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 pointer-events-none",
              wrapperClassName
            )}
          >
            <motion.div
              ref={sheetRef}
              drag={canDrag ? "y" : false}
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.15 }}
              onDragEnd={handleDragEnd}
              className={cn("pointer-events-auto w-full sm:max-w-lg", className)}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd Frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: no errors related to `bottom-sheet.tsx`

---

### Task 2: Refactor catalogo sale-modal

**Files:**
- Modify: `Frontend/app/dashboard/catalogo/page.tsx`

The current structure (lines ~629–1090):
```tsx
<AnimatePresence>
  {showSaleModal && (
    <>
      <motion.div key="sale-backdrop" ... />       {/* remove */}
      <motion.div key="sale-modal" ...>            {/* remove */}
        <div className="pointer-events-auto relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col" ...>
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0"> {/* keep as-is */}
          ...rest of content...
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
```

Replace with:
```tsx
<BottomSheet
  open={showSaleModal}
  onClose={() => !submitting && setShowSaleModal(false)}
  disabled={submitting}
>
  <div
    className="relative w-full bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
    style={{ maxHeight: "92dvh" }}
  >
    {/* Mobile handle */}
    <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
      <div className="h-1 w-10 rounded-full bg-gray-200" />
    </div>
    {/* ...rest of content unchanged... */}
  </div>
</BottomSheet>
```

- [ ] **Step 1: Add import at top of catalogo/page.tsx**

Find the existing imports block and add:
```tsx
import { BottomSheet } from "@/components/ui/bottom-sheet"
```

- [ ] **Step 2: Replace the AnimatePresence + both motion.divs with BottomSheet**

Replace from `<AnimatePresence>` (the one wrapping `{showSaleModal && (`) through its closing `</AnimatePresence>` with the new `<BottomSheet>` structure shown above. Keep all inner content (header, success overlay, scrollable body, footer) unchanged except:
- Remove `onClick={(e) => e.stopPropagation()}` from the inner white div (BottomSheet handles this)
- Change `<div className="pointer-events-auto relative w-full sm:max-w-lg bg-white ...` → `<div className="relative w-full bg-white ...` (remove `pointer-events-auto sm:max-w-lg` since BottomSheet provides them)

- [ ] **Step 3: Verify no TypeScript errors**

Run: `cd Frontend && npx tsc --noEmit 2>&1 | head -30`
Expected: no new errors

---

### Task 3: Refactor ventas detail panel

**Files:**
- Modify: `Frontend/app/dashboard/ventas/page.tsx`

Current structure (lines ~661–680):
```tsx
<AnimatePresence>
  {selectedVentaId !== null && (
    <motion.div
      key="detail-mobile"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto lg:hidden"
    >
      <DetailPanel ... className="w-full rounded-b-none rounded-t-2xl border-x-0 border-b-0 shadow-xl" />
    </motion.div>
  )}
</AnimatePresence>
```

Replace with:
```tsx
<BottomSheet
  open={selectedVentaId !== null}
  onClose={() => setSelectedVentaId(null)}
  wrapperClassName="lg:hidden"
  className="max-h-[85vh] overflow-y-auto"
>
  <DetailPanel
    v={selectedVenta}
    ventaId={selectedVentaId}
    onClose={() => setSelectedVentaId(null)}
    onNavigate={() => router.push(`/dashboard/ventas/${selectedVentaId}`)}
    className="w-full rounded-b-none rounded-t-2xl border-x-0 border-b-0 shadow-xl"
  />
</BottomSheet>
```

- [ ] **Step 1: Add import**

```tsx
import { BottomSheet } from "@/components/ui/bottom-sheet"
```

- [ ] **Step 2: Replace AnimatePresence + motion.div with BottomSheet**

As shown above. Note: `selectedVenta` may be undefined when `selectedVentaId` is null — check that DetailPanel handles `v={undefined}` or cast appropriately (look at existing code for how `selectedVenta` is typed).

- [ ] **Step 3: Verify TypeScript**

Run: `cd Frontend && npx tsc --noEmit 2>&1 | head -30`
Expected: no errors

---

### Task 4: Commit

- [ ] **Commit the changes**

```bash
git add Frontend/components/ui/bottom-sheet.tsx \
        Frontend/app/dashboard/catalogo/page.tsx \
        Frontend/app/dashboard/ventas/page.tsx
git commit -m "feat(ui): add BottomSheet with drag-to-dismiss for mobile

Creates reusable BottomSheet component using framer-motion drag.
Closes on downward drag exceeding 30% of sheet height.
Disables drag while content is scrolled.
Refactors catalogo sale-modal and ventas detail panel to use it.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
