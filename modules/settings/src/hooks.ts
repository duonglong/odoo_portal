import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@odoo-portal/core';
import { SettingsRepository } from './repository.js';
import type { UserProfile } from './types.js';
import { useMemo } from 'react';

/** Creates the repository instance using the current OdoodClient */
function useSettingsRepo() {
    const { client } = useAuth();
    return useMemo(() => new SettingsRepository(client!), [client]);
}

export function useProfile() {
    const { session } = useAuth();
    const repo = useSettingsRepo();

    return useQuery({
        queryKey: ['settings', 'profile', session?.uid],
        queryFn: () => repo.getProfile(session!.uid!),
        enabled: !!session?.uid,
    });
}

export function useUpdateProfile() {
    const { session } = useAuth();
    const repo = useSettingsRepo();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ partnerId, data }: { partnerId: number, data: Partial<UserProfile> }) => {
            return repo.updateProfile(session!.uid!, partnerId, data);
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
            return repo.changePassword(currentPassword, newPassword);
        },
    });
}
