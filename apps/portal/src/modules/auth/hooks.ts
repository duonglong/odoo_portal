import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@odoo-portal/core';
import { appConfig } from '~/lib/app-config';

export function useLoginForm() {
    const { login, isLoading, session, isSessionChecked, error } = useAuth();
    const [loginEmail, setLoginEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    // Redirect already-authenticated users away from the login screen.
    useEffect(() => {
        if (isSessionChecked && session) {
            router.replace('/(app)');
        }
    }, [isSessionChecked, session]);

    const handleLogin = async () => {
        setLocalError(null);

        if (!loginEmail.trim() || !password.trim()) {
            setLocalError('Please enter your email and password/API key');
            return;
        }

        if (!appConfig.odooUrl || !appConfig.odooDatabase) {
            setLocalError('Odoo URL or Database is not configured.');
            return;
        }

        try {
            await login(
                { url: appConfig.odooUrl.trim().replace(/\/$/, ''), database: appConfig.odooDatabase.trim() },
                { login: loginEmail.trim(), password: password.trim() },
            );
            router.replace('/(app)');
        } catch {
            // error is captured in useAuth state and displayed inline
        }
    };

    return {
        loginEmail,
        setLoginEmail,
        password,
        setPassword,
        showPassword,
        setShowPassword,
        localError,
        handleLogin,
        isLoading,
        error,
    };
}
