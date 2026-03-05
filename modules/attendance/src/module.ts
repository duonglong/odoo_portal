import type { ModuleRegistration } from '@odoo-portal/types';

/**
 * Attendance module registration.
 *
 * Register this with ModuleRegistry in your app to activate the attendance feature:
 *   import { attendanceModule } from '@odoo-portal/attendance';
 *   import { ModuleRegistry } from '@odoo-portal/core';
 *   ModuleRegistry.register(attendanceModule);
 */
export const attendanceModule: ModuleRegistration = {
    module: {
        id: 'attendance',
        name: 'Attendance',
        icon: 'timer-outline',
        requiredModels: ['hr.attendance', 'hr.employee'],
        requiredGroups: ['hr_attendance.group_hr_attendance', 'hr_attendance.group_hr_attendance_manager'],
        routes: [
            {
                path: '/attendance',
                title: 'Attendance',
                icon: 'timer-outline',
                showInNav: true,
            },
            {
                path: '/attendance/history',
                title: 'History',
                icon: 'history',
                showInNav: false,
            },
        ],
    },
    loadScreens: async () => {
        const [{ default: ClockScreen }, { default: HistoryScreen }] =
            await Promise.all([
                import('./screens/ClockScreen.js'),
                import('./screens/HistoryScreen.js'),
            ]);
        return { ClockScreen, HistoryScreen };
    },
};
