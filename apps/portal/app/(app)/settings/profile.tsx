import React from 'react';
import { ProfileScreen } from '@odoo-portal/settings';
import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function ProfileRoute() {
    return (
        <View className="flex-1">
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Profile',
                    // Optional navigation back button config can go here
                }}
            />
            <ProfileScreen />
        </View>
    );
}
