// ResolvedNotice: what replaces the composer on a resolved ticket: the customer's rating (or that the survey is out) and a hint to
// reopen it. Ports the resolved branch of threadView (49-p-support.js).
export function ResolvedNotice({ rating }: { rating: number | null }) {
  return (
    <div className="border-t border-line bg-sunken px-3.5 py-3 text-sm text-ink2">
      This ticket is resolved
      {rating ? (
        <>
          {' '}
          and the customer rated it <span className="font-medium">{rating} / 5</span>
        </>
      ) : (
        ', the satisfaction survey is out'
      )}
      . Reopen it to reply.
    </div>
  );
}
