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
     * Get all attendance records for a specific calendar month.
     * Used for the calendar-grid view — no pagination, fetches entire month at once.
     */
    async getMonthAttendance(
        employeeId: number,
        year: number,
        month: number, // 1-indexed (1 = January)
    ): Promise<AttendanceRecord[]> {
        // Build ISO date strings for the first and last second of the month
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 1); // first day of next month (exclusive)
        const firstIso = firstDay.toISOString().slice(0, 19).replace('T', ' ');
        const lastIso = lastDay.toISOString().slice(0, 19).replace('T', ' ');

        const domain: OdooDomain = [
            ['employee_id', '=', employeeId],
            ['check_in', '>=', firstIso],
            ['check_in', '<', lastIso],
        ];
        const fields = getOdooFields(attendanceFieldMap);
        const raw = await this.client.searchRead<Record<string, unknown>>(
            ATTENDANCE_MODEL,
            domain,
            fields,
            { limit: 200, order: 'check_in asc' },
        );
        return raw.map((r) => mapFromOdoo<AttendanceRecord>(r, attendanceFieldMap));
    }

    /**
     * Check in or check out using standard stateless ORM methods instead
     * of the stateful /hr_attendance/systray_check_in_out controller endpoint.
     */
    async checkInOut(action: AttendanceAction): Promise<unknown> {
        // 1. Find if the employee already has an open attendance record
        const openRecords = await this.client.searchRead<{ id: number }>(
            ATTENDANCE_MODEL,
            [
                ['employee_id', '=', action.employeeId],
                ['check_out', '=', false]
            ],
            ['id'],
            { limit: 1 }
        );

        const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ');

        if (openRecords.length > 0) {
            // Clock OUT: update the open record
            return this.client.callKw(ATTENDANCE_MODEL, 'write', [
                [openRecords[0]!.id],
                { check_out: nowUtc }
            ]);
        } else {
            // Clock IN: create a new attendance record
            return this.client.callKw(ATTENDANCE_MODEL, 'create', [
                [{
                    employee_id: action.employeeId,
                    check_in: nowUtc
                }]
            ]);
        }
    }

}
