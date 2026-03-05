import type { OdooClient } from '@odoo-portal/odoo-client';
import { mapFromOdoo, getOdooFields } from '@odoo-portal/odoo-client';
import type { OdooDomain } from '@odoo-portal/types';
import type { AttendanceRecord, Employee, AttendanceAction } from './types.js';
import { attendanceFieldMap, employeeFieldMap } from './mappings.js';

const ATTENDANCE_MODEL = 'hr.attendance';
const EMPLOYEE_MODEL = 'hr.employee';

/**
 * Attendance repository — all Odoo calls for the attendance feature.
 * Components use this instead of calling client.searchRead directly.
 */
export class AttendanceRepository {
    constructor(private client: OdooClient) { }

    /** Get attendance records for the current user's employee */
    async getMyAttendance(
        employeeId: number,
        limit = 20,
        offset = 0,
    ): Promise<AttendanceRecord[]> {
        const domain: OdooDomain = [['employee_id', '=', employeeId]];
        const fields = getOdooFields(attendanceFieldMap);
        const raw = await this.client.searchRead<Record<string, unknown>>(
            ATTENDANCE_MODEL,
            domain,
            fields,
            { limit, offset, order: 'check_in desc' },
        );
        return raw.map((r: Record<string, unknown>) => mapFromOdoo<AttendanceRecord>(r, attendanceFieldMap));
    }

    /** Get the employee record for the current user (linked to res.users) */
    async getMyEmployee(userId: number): Promise<Employee | null> {
        const domain: OdooDomain = [['user_id', '=', userId]];
        const fields = getOdooFields(employeeFieldMap);
        const raw = await this.client.searchRead<Record<string, unknown>>(
            EMPLOYEE_MODEL,
            domain,
            fields,
            { limit: 1 },
        );
        if (!raw[0]) return null;
        return mapFromOdoo<Employee>(raw[0], employeeFieldMap);
    }

    /**
     * Check in or check out using Odoo's native attendance method.
     * Odoo 19 exposes `attendance_manual` on hr.employee.
     */
    async checkInOut(
        action: AttendanceAction,
    ): Promise<{ action: 'check_in' | 'check_out'; attendance_id: number }> {
        return this.client.callKw<{
            action: 'check_in' | 'check_out';
            attendance_id: number;
        }>(
            EMPLOYEE_MODEL,
            'attendance_manual',
            [[action.employeeId]],
            {
                next_action: action.reason ?? false,
            },
        );
    }

    /** Count total attendance records for an employee */
    async countAttendance(employeeId: number): Promise<number> {
        return this.client.searchCount(ATTENDANCE_MODEL, [
            ['employee_id', '=', employeeId],
        ]);
    }
}
