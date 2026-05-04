import React from 'react';
import { View, Text, ActivityIndicator, FlatList } from 'react-native';
import { Stack } from 'expo-router';
import { useSalesRecords } from '../hooks.js';

export default function SalesMainScreen() {
    const { data: records, isLoading } = useSalesRecords();

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-slate-50">
            <Stack.Screen options={{ title: 'Sales Orders' }} />
            <FlatList
                data={records ?? []}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    <View className="bg-white mx-4 my-2 p-4 rounded-xl border border-slate-200">
                        <Text className="font-semibold text-slate-900">{item.name}</Text>
                    </View>
                )}
                contentContainerStyle={{ paddingVertical: 16 }}
            />
        </View>
    );
}
