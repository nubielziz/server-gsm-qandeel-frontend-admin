# 003 UI approach

**Context.** The demo already has a complete, documented design (`DESIGN.md`): tokens, component classes in `input.css`, helpers in `20-ui.js` (table, modal, drawer, tabs, segmented control, switch, badges, toasts, palette), its own icon set (`ICONS` in `00-util.js`) and native `<dialog>` overlays. The brief says keep the look.

**Options.** (a) Headless Refine + our own Tailwind components ported from the demo. (b) A UI kit (Ant Design, MUI, Mantine, shadcn/ui) restyled to match. (c) Refine's own UI integrations.

**Decision.** (a). `src/components/ui` ports the demo helpers one to one: `table`→`DataTable`, `modal`→`Modal`/`FormDialog`, `confirmDlg`→`ConfirmDialog`, `openDrawer`→`Drawer`, `tabsEl`→`Tabs`, `segEl`→`SegmentedControl`, `switchEl`→`Switch`, `statGrid`→`StatGrid`, `panel`→`Panel`, `pageHead`→`PageHeader`, `kv`→`KeyValue`, `badge`/`typeTag`/status badges→`Badge`/`TypeTag`/`StatusBadge`, `avatar`→`Avatar`, `field`/`selectEl`/`searchEl`→form fields, `toast`→`Toaster` (also Refine's notificationProvider), `emptyBlock`/`errorBlock`/`skel*`→`EmptyState`/`ErrorState`/`Skeleton`, `menuEl`→`Menu`, `timeline`→`Timeline`, palette→`CommandPalette`. Icons: an `Icon` component with the demo's SVG paths. Overlays keep native `<dialog>` (focus trap, Esc, top layer for free).

**Why not a kit.** Every kit ships its own spacing, radii, focus and motion; matching the demo would mean overriding most of it and fighting upgrades. The demo's helpers are small and already accessible.

**Consequences.** We own ~30 small components; each follows the demo markup and classes, so screenshots line up. No icon or UI library dependency.
