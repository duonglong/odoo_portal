import type { OdooClientError } from '@odoo-portal/odoo-client';

export interface OdooErrorToast {
    title: string;
    message: string;
}

/**
 * Maps any thrown error from the Odoo client layer to a user-friendly
 * { title, message } pair suitable for display in a toast or alert.
 *
 * This is a **pure function** — safe to call inside event handlers,
 * mutation `onError` callbacks, or component render.
 *
 * Returns null when the error value is null/undefined (no error to show).
 *
 * Usage in a mutation callback (onError):
 *   const toast = mapOdooError(err);
 *   Alert.alert(toast?.title ?? 'Error', toast?.message ?? 'Something went wrong');
 *
 * Usage as a React hook (derive from stateful error, e.g. mutation.error):
 *   const toast = useOdooErrorToast(mutation.error);
 *   useEffect(() => { if (toast) Alert.alert(toast.title, toast.message); }, [toast]);
 */
export function mapOdooError(error: unknown): OdooErrorToast | null {
    if (error == null) return null;

    if (typeof error === 'object' && error !== null && 'name' in error) {
        const errMap = error as { name: string; message?: string };

        switch (errMap.name) {
            case 'NetworkError':
                return {
                    title: 'Connection Error',
                    message: 'Cannot reach the server. Check your internet connection.',
                };
            case 'SessionExpiredError':
                return {
                    title: 'Session Expired',
                    message: 'Your session has expired. Please log in again.',
                };
            case 'AccessDeniedError':
                return {
                    title: 'Access Denied',
                    message: errMap.message ?? 'Access Denied',
                };
            case 'RpcError':
                return {
                    title: 'Odoo Error',
                    message: errMap.message ?? 'An RPC error occurred',
                };
            case 'OdooClientError':
                return {
                    title: 'Error',
                    message: errMap.message ?? 'An Odoo client error occurred',
                };
        }
    }

    if (error instanceof Error) {
        return {
            title: 'Error',
            message: error.message,
        };
    }

    return {
        title: 'Error',
        message: 'An unexpected error occurred.',
    };
}

/**
 * React hook wrapper — derives toast info from a stateful error value.
 * Identical to mapOdooError but named as a hook for conventional usage
 * with mutation.error or query.error at component top level.
 */
export function useOdooErrorToast(error: unknown): OdooErrorToast | null {
    return mapOdooError(error);
}
