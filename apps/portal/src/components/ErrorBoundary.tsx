import React, { type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false, message: '' };

    static getDerivedStateFromError(err: unknown): State {
        return {
            hasError: true,
            message: err instanceof Error ? err.message : 'An unexpected error occurred.',
        };
    }

    override componentDidCatch(err: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', err, info.componentStack);
    }

    override render() {
        if (this.state.hasError) {
            return (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                    <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
                        Something went wrong
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, textAlign: 'center' }}>
                        {this.state.message}
                    </Text>
                    <Pressable
                        onPress={() => this.setState({ hasError: false, message: '' })}
                        style={{ paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#3b82f6', borderRadius: 8 }}
                        accessibilityLabel="Try again"
                    >
                        <Text style={{ color: '#fff', fontWeight: '600' }}>Try again</Text>
                    </Pressable>
                </View>
            );
        }
        return this.props.children;
    }
}
