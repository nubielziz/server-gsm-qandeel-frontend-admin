// ResolvedNotice: what replaces the composer on a resolved ticket: that it is resolved and a hint to reopen it. Ports the resolved
// branch of threadView (49-p-support.js).
export function ResolvedNotice() {
  return (
    <div className="border-t border-line bg-sunken px-3.5 py-3 text-sm text-ink2">
      This ticket is resolved. Reopen it to reply.
    </div>
  );
}
