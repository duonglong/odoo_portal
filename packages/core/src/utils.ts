/**
 * Shared formatting utilities for attendance screens.
 *
 * Timezone note
 * ─────────────
 * Odoo stores all datetime fields in UTC and returns them as bare strings
 * like "2026-03-05 06:50:00" (space-separated, no timezone suffix).
 * JavaScript's Date constructor treats strings without a timezone indicator
 * as *local time* on most runtimes, causing times to shift by the UTC offset
 * of the device.
 *
 * The fix: `odooToDate()` appends "Z" so the string is always parsed as UTC,
 * allowing the browser/device to apply its own local offset for display.
 */

/**
 * Convert an Odoo datetime string (UTC, no tz info) to a JavaScript Date.
 * Handles both "YYYY-MM-DD HH:MM:SS" (Odoo format) and proper ISO 8601.
 * Returns null for falsy input.
 */
export function odooToDate(val: string | null | undefined): Date | null {
    if (!val) return null;
    // If the string already has a timezone indicator (Z or +HH:MM), parse as-is.
    if (val.includes('Z') || val.includes('+') || (val.includes('-') && val.lastIndexOf('-') > 7)) {
        return new Date(val);
    }
    // Odoo format — replace space with T and append Z to signal UTC.
    return new Date(val.replace(' ', 'T') + 'Z');
}

/** Format an Odoo datetime string as local time (e.g. "09:30 AM") */
export const fmtTime = (val: string | null | undefined): string => {
    const d = odooToDate(val);
    if (!d) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/** Format an Odoo datetime string as short date (e.g. "Mon, Mar 5") */
export const fmtDate = (val: string): string => {
    const d = odooToDate(val);
    if (!d) return '—';
    return d.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
};

/** Format an Odoo datetime string to day number only (e.g. "05") */
export const fmtDayOnly = (val: string): string => {
    const d = odooToDate(val);
    if (!d) return '—';
    return d.toLocaleDateString([], { day: '2-digit' });
};

/** Format an Odoo datetime string to abbreviated month (e.g. "Mar") */
export const fmtMonthOnly = (val: string): string => {
    const d = odooToDate(val);
    if (!d) return '—';
    return d.toLocaleDateString([], { month: 'short' });
};

/** Format decimal hours to human-readable string (e.g. "2h 30m") */
export const fmtDuration = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};
