// Module registration
export { attendanceModule } from './module.js';

// Domain types
export type { AttendanceRecord, Employee, AttendanceAction } from './types.js';

// Mappings (useful for customization)
export { attendanceFieldMap, employeeFieldMap } from './mappings.js';

// Repository (for custom use cases)
export { AttendanceRepository } from './repository.js';

// Hooks
export { useMyEmployee, useAttendanceRecords, useCheckInOut } from './hooks.js';

// Screens (lazy-loaded via attendanceModule.loadScreens normally)
export { default as ClockScreen } from './screens/ClockScreen.js';
export { default as HistoryScreen } from './screens/HistoryScreen.js';
export { default as AttendanceSummaryScreen } from './screens/AttendanceSummaryScreen.js';
