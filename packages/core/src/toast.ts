import { mapOdooError } from './hooks/use-odoo-error-toast.js';

let _toastCounter = 0;

export type ToastMessage = {
    id: string;
    title: string;
    message: string;
    type?: 'success' | 'error';
};

export const toast = {
    listeners: new Set<(toast: ToastMessage) => void>(),

    emit(t: Omit<ToastMessage, 'id'>) {
        if (!t) return;
        const message = { ...t, id: `toast-${++_toastCounter}` };
        this.listeners.forEach((listener) => listener(message));
    },

    success(title: string, message: string = '') {
        this.emit({ title, message, type: 'success' });
    },

    error(title: string, message: string = '') {
        this.emit({ title, message, type: 'error' });
    },

    odooError(error: unknown) {
        const odooToast = mapOdooError(error);
        if (odooToast) {
            this.emit({ ...odooToast, type: 'error' });
        }
    },

    subscribe(listener: (toast: ToastMessage) => void) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
};
