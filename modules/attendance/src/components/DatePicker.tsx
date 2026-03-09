import React, { useState, useRef } from 'react';
import { View, Platform, TouchableOpacity, Text, Modal, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DatePickerProps {
    value: string; // ISO format: YYYY-MM-DD
    onChange: (date: string) => void;
    minimumDate?: Date;
    maximumDate?: Date;
    children: React.ReactNode;
}

export function DatePicker({ value, onChange, minimumDate, maximumDate, children }: DatePickerProps) {
    const [showNativePicker, setShowNativePicker] = useState(false);

    // Map "YYYY-MM-DD" to Date
    const handleDateInit = (isoString?: string) => {
        if (!isoString) return new Date();
        const [y, m, d] = isoString.split('-');
        if (!y || !m || !d) return new Date();
        return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    };

    const parsedDate = handleDateInit(value);

    // Platform: Web
    if (Platform.OS === 'web') {
        // Render a native HTML5 input element through the react-native-web createElement backdoor
        // We make the input completely transparent and absolute to capture all clicks on the children wrapper.
        return (
            <View style={{ flex: 1, position: 'relative' }}>
                {children}
                <input
                    type="date"
                    value={value}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val) onChange(val);
                    }}
                    min={minimumDate ? minimumDate.toISOString().split('T')[0] : undefined}
                    max={maximumDate ? maximumDate.toISOString().split('T')[0] : undefined}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer',
                        zIndex: 10
                    }}
                    onClick={(e) => {
                        try {
                            if ('showPicker' in e.target) {
                                (e.target as any).showPicker();
                            }
                        } catch (err) { }
                    }}
                />
            </View>
        );
    }

    // Platform: iOS & Android
    return (
        <>
            <TouchableOpacity
                style={{ flex: 1 }}
                activeOpacity={0.7}
                onPress={() => setShowNativePicker(true)}
            >
                {children}
            </TouchableOpacity>

            {showNativePicker && Platform.OS === 'android' && (
                <DateTimePicker
                    value={parsedDate}
                    mode="date"
                    display="default"
                    minimumDate={minimumDate}
                    maximumDate={maximumDate}
                    onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                        setShowNativePicker(false);
                        if (selectedDate) {
                            const iso = selectedDate.toISOString().split('T')[0];
                            if (iso) onChange(iso);
                        }
                    }}
                />
            )}

            {showNativePicker && Platform.OS === 'ios' && (
                <Modal
                    transparent={true}
                    animationType="fade"
                    visible={showNativePicker}
                    onRequestClose={() => setShowNativePicker(false)}
                >
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowNativePicker(false)}
                    >
                        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={() => setShowNativePicker(false)}>
                                    <Text style={styles.doneButton}>Done</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={parsedDate}
                                mode="date"
                                display="spinner"
                                minimumDate={minimumDate}
                                maximumDate={maximumDate}
                                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                                    if (selectedDate) {
                                        const iso = selectedDate.toISOString().split('T')[0];
                                        if (iso) onChange(iso);
                                    }
                                }}
                            />
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        paddingBottom: 20,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    doneButton: {
        color: '#3713ec',
        fontSize: 16,
        fontWeight: '600',
    }
});
