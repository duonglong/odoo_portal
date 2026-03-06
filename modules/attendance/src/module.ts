import type { ModuleRegistration } from '@odoo-portal/types';
import AttendanceHoursMetric from './widgets/AttendanceHoursMetric.js';
import AttendanceModuleCard from './widgets/AttendanceModuleCard.js';

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
            {
                path: '/attendance/leave-request',
                title: 'Leaves',
                icon: 'calendar-multiselect-outline',
                showInNav: true,
            },
        ],
    },
    loadScreens: async () => {
        const { default: HistoryScreen } = await import('./screens/HistoryScreen.js');
        const { default: LeaveRequestScreen } = await import('./screens/LeaveRequestScreen.js');
        return { HistoryScreen, LeaveRequestScreen };
    },
    dashboardWidgets: [
        {
            id: 'attendance-hours-today',
            order: 10,
            MetricCard: AttendanceHoursMetric as any,
        },
        {
            id: 'attendance-module-card',
            order: 10,
            ModuleCard: AttendanceModuleCard as any,
        },
    ],
};
