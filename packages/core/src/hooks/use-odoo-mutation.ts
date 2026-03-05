import {
    useMutation,
    useQueryClient,
    type UseMutationOptions,
} from '@tanstack/react-query';
import type { OdooClient } from '@odoo-portal/odoo-client';

// ── Create ──────────────────────────────────────

interface CreateVars {
    values: Record<string, unknown>;
}

export interface UseOdooCreateOptions {
    model: string;
    client: OdooClient | null;
    /** Invalidate queries for these models after success */
    invalidateModels?: string[];
    mutationOptions?: Omit<UseMutationOptions<number, Error, CreateVars>, 'mutationFn'>;
}

/** Create a new record. Returns the new record ID. */
export const useOdooCreate = ({
    model,
    client,
    invalidateModels,
    mutationOptions = {},
}: UseOdooCreateOptions) => {
    const queryClient = useQueryClient();

    return useMutation<number, Error, CreateVars>({
        mutationFn: async ({ values }) => {
            if (!client) throw new Error('Not authenticated');
            return client.create(model, values);
        },
        onSuccess: () => {
            const models = invalidateModels ?? [model];
            for (const m of models) {
                void queryClient.invalidateQueries({ queryKey: ['odoo', m] });
            }
        },
        ...mutationOptions,
    });
};

// ── Update ──────────────────────────────────────

interface UpdateVars {
    ids: number[];
    values: Record<string, unknown>;
}

export interface UseOdooUpdateOptions {
    model: string;
    client: OdooClient | null;
    invalidateModels?: string[];
    mutationOptions?: Omit<UseMutationOptions<boolean, Error, UpdateVars>, 'mutationFn'>;
}

/** Update existing records. */
export const useOdooUpdate = ({
    model,
    client,
    invalidateModels,
    mutationOptions = {},
}: UseOdooUpdateOptions) => {
    const queryClient = useQueryClient();

    return useMutation<boolean, Error, UpdateVars>({
        mutationFn: async ({ ids, values }) => {
            if (!client) throw new Error('Not authenticated');
            return client.write(model, ids, values);
        },
        onSuccess: () => {
            const models = invalidateModels ?? [model];
            for (const m of models) {
                void queryClient.invalidateQueries({ queryKey: ['odoo', m] });
            }
        },
        ...mutationOptions,
    });
};

// ── Delete ──────────────────────────────────────

interface DeleteVars {
    ids: number[];
}

export interface UseOdooDeleteOptions {
    model: string;
    client: OdooClient | null;
    invalidateModels?: string[];
    mutationOptions?: Omit<UseMutationOptions<boolean, Error, DeleteVars>, 'mutationFn'>;
}

/** Delete records by IDs. */
export const useOdooDelete = ({
    model,
    client,
    invalidateModels,
    mutationOptions = {},
}: UseOdooDeleteOptions) => {
    const queryClient = useQueryClient();

    return useMutation<boolean, Error, DeleteVars>({
        mutationFn: async ({ ids }) => {
            if (!client) throw new Error('Not authenticated');
            return client.unlink(model, ids);
        },
        onSuccess: () => {
            const models = invalidateModels ?? [model];
            for (const m of models) {
                void queryClient.invalidateQueries({ queryKey: ['odoo', m] });
            }
        },
        ...mutationOptions,
    });
};

// ── Call Custom Method ──────────────────────────

interface CallKwVars {
    method: string;
    args?: unknown[];
    kwargs?: Record<string, unknown>;
}

export interface UseOdooCallOptions {
    model: string;
    client: OdooClient | null;
    invalidateModels?: string[];
    mutationOptions?: Omit<UseMutationOptions<unknown, Error, CallKwVars>, 'mutationFn'>;
}

/** Call any custom model method (escape hatch for non-CRUD operations). */
export const useOdooCall = ({
    model,
    client,
    invalidateModels,
    mutationOptions = {},
}: UseOdooCallOptions) => {
    const queryClient = useQueryClient();

    return useMutation<unknown, Error, CallKwVars>({
        mutationFn: async ({ method, args = [], kwargs = {} }) => {
            if (!client) throw new Error('Not authenticated');
            return client.callKw(model, method, args, kwargs);
        },
        onSuccess: () => {
            if (invalidateModels) {
                for (const m of invalidateModels) {
                    void queryClient.invalidateQueries({ queryKey: ['odoo', m] });
                }
            }
        },
        ...mutationOptions,
    });
};
