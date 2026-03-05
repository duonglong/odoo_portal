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
     * Fetch the attendance kiosk key from the user's company.
     * Required as the token param for /hr_attendance/manual_selection.
     */
    private async getKioskToken(): Promise<string> {
        const raw = await this.client.searchRead<Record<string, unknown>>(
            'res.company',
            [],
            ['attendance_kiosk_key'],
            { limit: 1 },
        );
        const token = raw[0]?.['attendance_kiosk_key'];
        if (!token || typeof token !== 'string') {
            throw new Error('Could not retrieve attendance kiosk token from company settings.');
        }
        return token;
    }

    /**
     * Check in or check out using Odoo 19's /hr_attendance/manual_selection endpoint.
     * (attendance_manual was removed in Odoo 17+)
     */
    async checkInOut(action: AttendanceAction): Promise<unknown> {
        const token = await this.getKioskToken();
        return this.client.callRoute('/hr_attendance/manual_selection', {
            token,
            employee_id: action.employeeId,
            pin_code: action.pinCode ?? '',
            work_location: false,
        });
    }

}
