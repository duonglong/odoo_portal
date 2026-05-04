import React from 'react';
import { ProfileScreen } from '../../../src/modules/settings';
import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function ProfileRoute() {
    return (
        <View className="flex-1">
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Profile',
                }}
            />
            <ProfileScreen />
        </View>
    );
}
