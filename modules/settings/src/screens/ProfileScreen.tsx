import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useProfile, useUpdateProfile, useUploadProfileImage } from '../hooks.js';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { toast } from '@odoo-portal/core';

export default function ProfileScreen() {
    const { data: profile, isLoading, error } = useProfile();
    const updateProfile = useUpdateProfile();
    const uploadImage = useUploadProfileImage();
    const [formData, setFormData] = useState<any>({});
    
    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.name || '',
                jobPosition: profile.jobPosition || '',
                taxId: profile.taxId || '',
                website: profile.website || '',
                companyName: profile.companyName || '',
                street: profile.street || '',
                city: profile.city || '',
                state: profile.stateId?.name || '',
                zip: profile.zip || '',
                country: profile.countryId?.name || ''
            });
        }
    }, [profile]);

    const handleSave = async () => {
        if (!profile?.partnerId) return;
        
        try {
            await updateProfile.mutateAsync({
                partnerId: profile.partnerId,
                data: {
                    name: formData.name,
                    taxId: formData.taxId,
                    website: formData.website,
                    street: formData.street,
                    city: formData.city,
                    zip: formData.zip,
                }
            });
            toast.success('Profile updated', 'Your changes have been saved.');
        } catch (e: any) {
            toast.error('Update failed', e.message || 'Failed to update profile');
        }
    };

    const handlePickImage = async () => {
        if (!profile?.partnerId) return;

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            toast.error('Permission required', 'Please allow access to your photo library.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: true,
        });

        if (result.canceled || !result.assets[0]?.base64) return;

        try {
            await uploadImage.mutateAsync({
                partnerId: profile.partnerId,
                base64: result.assets[0].base64,
            });
            toast.success('Photo updated', 'Your profile picture has been changed.');
        } catch (e: any) {
            toast.error('Upload failed', e.message || 'Failed to upload profile picture');
        }
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-surface-container-low">
                <ActivityIndicator size="large" color="#3713ec" />
            </View>
        );
    }
    
    if (error || !profile) {
        return (
            <View className="flex-1 items-center justify-center p-4">
                <Text className="text-error mb-2">Error loading profile</Text>
                <Text className="text-slate-500 text-center">{error?.message}</Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-slate-50">
            <Stack.Screen options={{ title: 'Settings', headerShown: false }} />
            
            {/* Settings Header Area (Desktop) */}
            <View className="bg-white border-b border-slate-200 px-4 md:px-8 py-6 mb-6 md:mb-8 hidden md:flex">
                <Text className="text-2xl font-black text-slate-900 mb-1">Settings</Text>
                <Text className="text-slate-500 font-medium text-sm">Manage your account settings and preferences.</Text>
            </View>

            <View className="max-w-7xl mx-auto px-4 md:px-8 w-full mb-12">
                

                {/* Settings Content Area */}
                <View className="flex-1 max-w-4xl">
                    {/* Page Header */}
                        <View className="mb-8">
                            <Text className="text-3xl font-black text-slate-900 mb-2">Profile Details</Text>
                            <Text className="text-slate-500 font-medium">Manage your public presence and personal information.</Text>
                        </View>

                {/* Core Identity Section */}
                <View className="bg-white rounded-xl p-6 md:p-8 border border-slate-200 shadow-sm mb-8 overflow-hidden relative">
                    <View className="absolute -top-3 -right-3 opacity-5">
                        <MaterialCommunityIcons name="face-man" size={80} color="#000" style={{ transform: [{ rotate: '15deg' }] }} />
                    </View>
                    
                    <View className="flex-row items-start gap-6 mb-8 z-10">
                        <View className="relative">
                            <View className="w-24 h-24 rounded-xl border-4 border-white shadow-sm bg-slate-200 items-center justify-center overflow-hidden">
                                {profile.image1920 ? (
                                    <Image
                                        source={{ uri: `data:image/jpeg;base64,${profile.image1920}` }}
                                        className="w-full h-full"
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Text className="text-3xl font-bold text-slate-400">{profile.name.charAt(0)}</Text>
                                )}
                                {uploadImage.isPending && (
                                    <View className="absolute inset-0 bg-black/40 items-center justify-center">
                                        <ActivityIndicator size="small" color="white" />
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity
                                className="absolute -bottom-2 -right-2 bg-primary p-2 rounded-lg shadow-sm"
                                onPress={handlePickImage}
                                disabled={uploadImage.isPending}
                            >
                                <MaterialCommunityIcons name="pencil" size={16} color="white" />
                            </TouchableOpacity>
                        </View>
                        <View className="flex-1 justify-center py-2">
                            <Text className="text-lg font-bold text-slate-900 mb-1">Personal Information</Text>
                            <Text className="text-xs text-slate-500">Public profile details used for your professional identity.</Text>
                        </View>
                    </View>

                    <View className="flex-row flex-wrap -mx-3">
                        <View className="w-full md:w-1/2 px-3 mb-6">
                            <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Name</Text>
                            <TextInput 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium"
                                value={formData.name}
                                onChangeText={t => setFormData({...formData, name: t})}
                            />
                        </View>
                        <View className="w-full md:w-1/2 px-3 mb-6">
                            <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Job Position</Text>
                            <TextInput 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium opacity-70"
                                value={formData.jobPosition}
                                editable={false}
                            />
                        </View>
                        <View className="w-full md:w-1/2 px-3 mb-6">
                            <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Tax ID</Text>
                            <TextInput 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium"
                                value={formData.taxId}
                                onChangeText={t => setFormData({...formData, taxId: t})}
                            />
                        </View>
                        <View className="w-full md:w-1/2 px-3 mb-6">
                            <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Website</Text>
                            <TextInput 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium"
                                value={formData.website}
                                onChangeText={t => setFormData({...formData, website: t})}
                            />
                        </View>
                    </View>

                    <View className="mt-4 pt-8 border-t border-slate-100">
                        <View className="flex-row items-center gap-2 mb-4">
                            <MaterialCommunityIcons name="domain" size={20} color="#3713ec" />
                            <Text className="text-sm font-bold text-slate-900">Organization & Address</Text>
                        </View>

                        <View className="mb-6">
                            <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Company</Text>
                            <TextInput 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium opacity-70"
                                value={formData.companyName}
                                editable={false}
                            />
                        </View>

                        <View className="flex-row flex-wrap -mx-2">
                            <View className="w-full px-2 mb-6">
                                <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Address (Street)</Text>
                                <TextInput 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium"
                                    value={formData.street}
                                    onChangeText={t => setFormData({...formData, street: t})}
                                />
                            </View>
                            <View className="w-full md:w-1/2 px-2 mb-6">
                                <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">City</Text>
                                <TextInput 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium"
                                    value={formData.city}
                                    onChangeText={t => setFormData({...formData, city: t})}
                                />
                            </View>
                            <View className="w-1/2 md:w-1/4 px-2 mb-6">
                                <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">State</Text>
                                <TextInput 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium opacity-70"
                                    value={formData.state}
                                    editable={false}
                                />
                            </View>
                            <View className="w-1/2 md:w-1/4 px-2 mb-6">
                                <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">ZIP</Text>
                                <TextInput 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium"
                                    value={formData.zip}
                                    onChangeText={t => setFormData({...formData, zip: t})}
                                />
                            </View>
                            <View className="w-full px-2 mb-6">
                                <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Country</Text>
                                <TextInput 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium opacity-70"
                                    value={formData.country}
                                    editable={false}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Change Password Section */}
                <View className="bg-white rounded-xl p-6 md:p-8 border border-slate-200 shadow-sm mb-8 overflow-hidden relative">
                    <View className="absolute -top-3 -right-3 opacity-5">
                        <MaterialCommunityIcons name="lock-reset" size={80} color="#3713ec" style={{ transform: [{ rotate: '15deg' }] }} />
                    </View>
                    <View className="z-10">
                        <View className="flex-row items-center gap-2 mb-6">
                            <MaterialCommunityIcons name="form-textbox-password" size={20} color="#3713ec" />
                            <Text className="text-lg font-bold text-slate-900">Change Password</Text>
                        </View>
                        
                        <View className="w-full max-w-2xl mb-6">
                            <Text className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Current Password</Text>
                            <TextInput 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm"
                                placeholder="••••••••"
                                secureTextEntry
                            />
                        </View>
                        <View className="flex-row flex-wrap -mx-3 mb-6 max-w-3xl">
                            <View className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                                <Text className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">New Password</Text>
                                <TextInput 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm"
                                    placeholder="••••••••"
                                    secureTextEntry
                                />
                            </View>
                            <View className="w-full md:w-1/2 px-3">
                                <Text className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Confirm New Password</Text>
                                <TextInput 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm"
                                    placeholder="••••••••"
                                    secureTextEntry
                                />
                            </View>
                        </View>
                        <View className="pt-2">
                            <TouchableOpacity className="bg-primary px-8 py-3 rounded-lg shadow-sm self-start">
                                <Text className="text-white font-bold text-sm">Update Password</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Actions Bar */}
                <View className="flex-row flex-wrap items-center justify-between pt-6 border-t border-slate-200 mt-4 mb-20 md:mb-8 gap-4">
                    <TouchableOpacity>
                        <Text className="text-slate-500 font-bold text-sm">Discard All Changes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        className={`bg-primary px-10 py-4 rounded-lg shadow-sm flex-row items-center gap-2 ${updateProfile.isPending ? 'opacity-50' : ''}`}
                        onPress={handleSave}
                        disabled={updateProfile.isPending}
                    >
                        <MaterialCommunityIcons name="content-save-outline" size={18} color="white" />
                        <Text className="text-white font-bold">{updateProfile.isPending ? 'Saving...' : 'Save Profile'}</Text>
                    </TouchableOpacity>
                </View>

            </View>
        </View>
        </ScrollView>
    );
}
