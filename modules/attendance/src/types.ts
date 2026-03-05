import type { OdooMany2One } from '@odoo-portal/types';

/**
 * Domain type for an attendance record (hr.attendance).
 */
export interface AttendanceRecord {
    id: number;
    employeeId: { id: number; name: string } | null;
    checkIn: string;   // ISO 8601
    checkOut: string | null;
    workedHours: number;
    reason: string | null;
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
}
