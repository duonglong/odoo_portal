import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@odoo-portal/core';
import { SettingsRepository, type UpdateProfileData } from './repository.js';
import { useMemo } from 'react';

export const QUERY_KEYS = {
    profile:   (uid: number)       => ['settings', 'profile', uid] as const,
    countries: ()                  => ['settings', 'countries'] as const,
    states:    (countryId: number) => ['settings', 'states', countryId] as const,
} as const;

/** Creates the repository instance using the current OdooClient — returns null when unauthenticated */
function useSettingsRepo() {
    const { client } = useAuth();
    return useMemo(
        () => (client ? new SettingsRepository(client) : null),
        [client],
    );
}

export function useProfile() {
    const { session } = useAuth();
    const repo = useSettingsRepo();
    const uid = session?.uid;

    return useQuery({
        queryKey: ['settings', 'profile', uid],
        queryFn: () => repo!.getProfile(uid!),
        enabled: repo !== null && uid != null,
    });
}

export function useUpdateProfile() {
    const { session } = useAuth();
    const repo = useSettingsRepo();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ partnerId, data }: { partnerId: number; data: UpdateProfileData }) => {
            if (!repo) throw new Error('Not authenticated');
            return repo.updateProfile(session?.uid!, partnerId, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings', 'profile', session?.uid] });
        }
    });
}

export function useUploadProfileImage() {
    const { session } = useAuth();
    const repo = useSettingsRepo();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ partnerId, base64 }: { partnerId: number; base64: string }) => {
            if (!repo) throw new Error('Not authenticated');
            return repo.uploadProfileImage(partnerId, base64);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings', 'profile', session?.uid] });
        },
    });
}

export function useChangePassword() {
    const repo = useSettingsRepo();

    return useMutation({
        mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
            if (!repo) throw new Error('Not authenticated');
            return repo.changePassword(currentPassword, newPassword);
        },
    });
}

export function useCountries() {
    const repo = useSettingsRepo();
    return useQuery({
        queryKey: ['settings', 'countries'],
        queryFn: () => repo!.getCountries(),
        enabled: repo !== null,
        staleTime: 1000 * 60 * 60, // 1 h — country list rarely changes
    });
}

export function useStates(countryId?: number) {
    const repo = useSettingsRepo();
    return useQuery({
        queryKey: ['settings', 'states', countryId],
        queryFn: () => repo!.getStates(countryId!),
        enabled: repo !== null && !!countryId,
        staleTime: 1000 * 60 * 60, // 1 h
    });
}
