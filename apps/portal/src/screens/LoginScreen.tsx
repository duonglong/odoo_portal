import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@odoo-portal/core';

export default function LoginScreen() {
    const { login, isLoading, session, isSessionChecked } = useAuth();

    // ── Inverse Auth Guard ──────────────────────────────────────────────
    // If the user is already logged in, redirect them to the app.
    useEffect(() => {
        if (isSessionChecked && session) {
            router.replace('/(app)');
        }
    }, [isSessionChecked, session]);
    // ────────────────────────────────────────────────────────────────────

    const [loginEmail, setLoginEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!loginEmail.trim() || !password.trim()) {
            Alert.alert('Error', 'Please enter your email and password/API key');
            return;
        }

        const envUrl = process.env.EXPO_PUBLIC_ODOO_URL;
        const envDb = process.env.EXPO_PUBLIC_ODOO_DATABASE;

        if (!envUrl || !envDb) {
            Alert.alert('Configuration Error', 'Odoo URL or Database is not configured in environment variables.');
            return;
        }

        try {
            await login(
                { url: envUrl.trim().replace(/\/$/, ''), database: envDb.trim() },
                { login: loginEmail.trim(), password: password.trim() },
            );
            router.replace('/(app)');
        } catch (err) {
            Alert.alert(
                'Login Failed',
                err instanceof Error ? err.message : 'Invalid credentials',
            );
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-surface"
        >
            <ScrollView
                className="flex-1"
                contentContainerClassName="flex-grow justify-center px-4 py-12 md:px-0"
                keyboardShouldPersistTaps="handled"
            >
                {/* Central Card */}
                <View className="bg-surface-raised rounded-card shadow-xl shadow-slate-200/50 p-6 md:p-10 mx-auto w-full max-w-[480px]">

                    {/* Header */}
                    <View className="items-center mb-8">
                        <Text className="text-text-primary text-3xl font-extrabold mb-1">Welcome Back</Text>
                        <Text className="text-text-secondary text-base">Sign in to your Odoo account</Text>
                    </View>

                    <View className="gap-8">
                        {/* Credentials */}
                        <View>
                            <View className="gap-3">
                                <View className="relative justify-center">
                                    <View className="absolute left-4 z-10">
                                        <MaterialCommunityIcons name="email-outline" size={20} color="#94a3b8" />
                                    </View>
                                    <TextInput
                                        className="bg-white text-text-primary rounded-xl pl-12 pr-4 h-14 border border-surface-border text-base"
                                        placeholder="Email Address"
                                        placeholderTextColor="#cbd5e1"
                                        value={loginEmail}
                                        onChangeText={setLoginEmail}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        keyboardType="email-address"
                                        textContentType="emailAddress"
                                    />
                                </View>

                                <View className="relative justify-center">
                                    <View className="absolute left-4 z-10">
                                        <MaterialCommunityIcons name="lock-outline" size={20} color="#94a3b8" />
                                    </View>
                                    <TextInput
                                        className="bg-white text-text-primary rounded-xl pl-12 pr-12 h-14 border border-surface-border text-base"
                                        placeholder="Password"
                                        placeholderTextColor="#cbd5e1"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        textContentType="password"
                                    />
                                    <TouchableOpacity
                                        className="absolute right-4 p-1 z-10"
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <MaterialCommunityIcons
                                            name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                            size={20}
                                            color="#94a3b8"
                                        />
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity className="self-end mt-1">
                                    <Text className="text-odoo-primary text-sm font-bold">Forgot password?</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                        className={`rounded-xl py-4 items-center mt-10 shadow-lg shadow-odoo-primary/30 border-b-[4px] border-black/10 ${isLoading ? 'bg-odoo-primary/70' : 'bg-odoo-primary'
                            }`}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white font-bold text-lg">Sign In to Portal</Text>
                        )}
                    </TouchableOpacity>

                    {/* Info Banner for Odoo 19 */}
                    <View className="mt-8 bg-blue-50 rounded-xl p-4 flex-row items-center gap-3 border border-blue-100">
                        <MaterialCommunityIcons name="information-outline" size={20} color="#2563eb" />
                        <Text className="text-blue-900 text-xs flex-1">
                            <Text className="font-bold">Odoo 19+ users: </Text>
                            For enhanced security, use API Keys instead of your password.
                        </Text>
                    </View>
                </View>

                {/* Footer */}
                <View className="items-center mt-8 pb-8">
                    <Text className="text-text-muted text-xs">
                        © 2024 Odoo Portal Integration. Professional Edition.
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
