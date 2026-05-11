// Default values for all user preferences.
// The server merges stored preferences with these defaults, so adding a new
// key here is enough — no migration or backfill needed.

export const DEFAULT_PREFERENCES = {
  // Max characters shown for a habit name on the dashboard grid.
  // Names longer than this are truncated with '…'. The full name is always
  // stored and visible in edit/detail views.
  habitNameDisplayLength: 20
};
