// Odoo hr.leave models

export interface LeaveType {
    id: number;
    name: string;
    requires_allocation: 'no' | 'yes';
}

// Domain Models (Clean, no Odoo fields)
export interface LeaveBalance {
    id: number;
    typeId: number;
    typeName: string;
    maxLeaves: number;
    leavesTaken: number;
}

export interface LeaveRequest {
    id: number;
    employeeId: number;
    employeeName: string;
    typeId: number;
    typeName: string;
    startDate: string;
    endDate: string;
    duration: number; // number_of_days
    status: 'draft' | 'confirm' | 'refuse' | 'validate1' | 'validate';
    description: string;
}

/**
 * Domain type for an attendance record (hr.attendance).
 */
export interface AttendanceRecord {
    id: number;
    employeeId: { id: number; name: string } | null;
    checkIn: string;   // ISO 8601
    checkOut: string | null;
    workedHours: number;
}

/**
 * Domain type for an employee (hr.employee) — minimal view.
 */
export interface Employee {
    id: number;
    name: string;
    jobTitle: string | null;
    departmentId: { id: number; name: string } | null;
    /** Whether the employee is currently clocked in */
    attendanceState: 'checked_in' | 'checked_out';
}

/**
 * Payload for checking in / checking out.
 */
export interface AttendanceAction {
    employeeId: number;
    /** ISO 8601 timestamp — omit to use server time */
    timestamp?: string;
    /** Reason / note (optional) */
    reason?: string;
    /** PIN code required when company attendance_kiosk_use_pin is enabled */
    pinCode?: string;
}
