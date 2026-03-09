// Module registration
export { attendanceModule } from './module.js';

// Domain types
export type { AttendanceRecord, Employee, AttendanceAction } from './types.js';

// Mappings (useful for customization)
export { attendanceFieldMap, employeeFieldMap } from './mappings.js';

// Repository (for custom use cases)
export { AttendanceRepository } from './repository.js';

// Hooks
export { useMyEmployee, useAttendanceRecords, useMonthAttendance, useCheckInOut } from './hooks.js';

// Screens
export { default as HistoryScreen } from './screens/HistoryScreen.js';
export { default as AttendanceSummaryScreen } from './screens/AttendanceSummaryScreen.js';
export { default as MyAttendanceScreen } from './screens/MyAttendanceScreen.js';
export { default as LeaveRequestScreen } from './screens/LeaveRequestScreen.js';
export { default as LeaveRequestListScreen } from './screens/LeaveRequestListScreen.js';

// Dashboard Widgets
export { default as AttendanceHoursMetric } from './widgets/AttendanceHoursMetric.js';
export { default as AttendanceModuleCard } from './widgets/AttendanceModuleCard.js';
