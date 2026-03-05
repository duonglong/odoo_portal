/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./src/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
        // Target specifically the src folders inside each module to avoid matching node_modules
        "../../modules/*/src/**/*.{js,jsx,ts,tsx}",
        "../../packages/ui/src/**/*.{js,jsx,ts,tsx}"
    ],
    presets: [require('nativewind/preset')],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#3713ec',
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#3713ec', // New royal blue from design
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                },
                'odoo-primary': '#875A7B', // Plum color from login design
                surface: {
                    DEFAULT: '#f8fafc',  // Light slate-50 background
                    raised: '#ffffff',    // White cards
                    card: '#ffffff',
                    border: '#e2e8f0',   // slate-200
                },
                text: {
                    primary: '#0f172a',   // slate-900
                    secondary: '#64748b', // slate-500
                    muted: '#94a3b8',     // slate-400
                },
                success: '#10b981', // emerald-500
                warning: '#f59e0b', // amber-500
                error: '#ef4444',   // red-500
                info: '#3b82f6',    // blue-500
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Inter', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                card: '16px', // rounded-2xl
                button: '8px',
            },
        },
    },
    plugins: [],
};
