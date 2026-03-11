import type { OdooClient } from '@odoo-portal/odoo-client';
import { mapFromOdoo, getOdooFields } from '@odoo-portal/odoo-client';
import type { OdooDomain } from '@odoo-portal/types';
import type { AttendanceRecord, Employee, AttendanceAction, LeaveRequest, LeaveBalance } from './types.js';
import { attendanceFieldMap, employeeFieldMap, leaveRequestFieldMap, leaveAllocationFieldMap } from './mappings.js';

const ATTENDANCE_MODEL = 'hr.attendance';
const EMPLOYEE_MODEL = 'hr.employee';
const LEAVE_MODEL = 'hr.leave';
const LEAVE_ALLOCATION_MODEL = 'hr.leave.allocation';

export type LeaveFilters = {
    year?: number;
    status?: string; // 'all' | 'approved' | 'pending' | 'draft'
};

/**
 * Attendance repository — all Odoo calls for the attendance feature.
 */
export class AttendanceRepository {
    constructor(private client: OdooClient) { }

    /** Get attendance records for the current user's employee */
    async getMyAttendance(employeeId: number, limit = 20, offset = 0): Promise<AttendanceRecord[]> {
        const domain: OdooDomain = [['employee_id', '=', employeeId]];
        const fields = getOdooFields(attendanceFieldMap);
        const raw = await this.client.searchRead<Record<string, unknown>>(
            ATTENDANCE_MODEL,
            domain,
            fields,
            { limit, offset, order: 'check_in desc' },
        );
        return raw.map((r) => mapFromOdoo<AttendanceRecord>(r, attendanceFieldMap));
    }

    /** Get the employee record for the current user */
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

    async getMonthAttendance(employeeId: number, year: number, month: number): Promise<AttendanceRecord[]> {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 1);
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

    async checkInOut(action: AttendanceAction): Promise<unknown> {
        const openRecords = await this.client.searchRead<{ id: number }>(
            ATTENDANCE_MODEL,
            [['employee_id', '=', action.employeeId], ['check_out', '=', false]],
            ['id'],
            { limit: 1 }
        );

        const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ');

        if (openRecords.length > 0) {
            return this.client.callKw(ATTENDANCE_MODEL, 'write', [
                [openRecords[0]!.id],
                { check_out: nowUtc }
            ]);
        } else {
            return this.client.callKw(ATTENDANCE_MODEL, 'create', [
                [{ employee_id: action.employeeId, check_in: nowUtc }]
            ]);
        }
    }

    // --- Leave Management ---

    /**
     * Fetch leave allocations and aggregate them into balances.
     */
    async getLeaveBalances(employeeId: number): Promise<LeaveBalance[]> {
        const domain: OdooDomain = [
            ['employee_id', '=', employeeId],
            ['state', '=', 'validate']
        ];
        const fields = getOdooFields(leaveAllocationFieldMap);
        const raw = await this.client.searchRead<Record<string, unknown>>(
            LEAVE_ALLOCATION_MODEL,
            domain,
            fields
        );

        const allocations = raw.map(r => mapFromOdoo<{
            id: number;
            typeId: { id: number; name: string } | null;
            maxLeaves: number;
            leavesTaken: number;
        }>(r, leaveAllocationFieldMap));

        // Aggregate by Leave Type
        const balanceMap = new Map<number, LeaveBalance>();

        for (const alloc of allocations) {
            if (!alloc.typeId) continue;
            const tid = alloc.typeId.id;

            if (!balanceMap.has(tid)) {
                balanceMap.set(tid, {
                    id: alloc.id, // Just keep the first alloc ID for React keys if needed
                    typeId: tid,
                    typeName: alloc.typeId.name,
                    maxLeaves: 0,
                    leavesTaken: 0,
                });
            }

            const current = balanceMap.get(tid)!;
            current.maxLeaves += alloc.maxLeaves;
            current.leavesTaken += alloc.leavesTaken;
        }

        return Array.from(balanceMap.values());
    }

    /**
     * Fetch paginated leave requests with optional filters.
     */
    async getMyLeaveRequests(employeeId: number, filters: LeaveFilters = {}, limit = 20, offset = 0): Promise<LeaveRequest[]> {
        const domain: OdooDomain = [['employee_id', '=', employeeId]];

        if (filters.year) {
            const startYear = `${filters.year}-01-01 00:00:00`;
            const endYear = `${filters.year}-12-31 23:59:59`;
            domain.push(['request_date_from', '>=', startYear]);
            domain.push(['request_date_from', '<=', endYear]);
        }

        if (filters.status && filters.status !== 'all') {
            switch (filters.status) {
                case 'approved':
                    domain.push(['state', '=', 'validate']);
                    break;
                case 'pending':
                    domain.push(['state', 'in', ['confirm', 'validate1']]);
                    break;
                case 'draft':
                    domain.push(['state', '=', 'draft']);
                    break;
            }
        }

        const fields = getOdooFields(leaveRequestFieldMap);
        const raw = await this.client.searchRead<Record<string, unknown>>(
            LEAVE_MODEL,
            domain,
            fields,
            { limit, offset, order: 'request_date_from desc' }
        );

        return raw.map(r => {
            const req = mapFromOdoo<any>(r, leaveRequestFieldMap);
            return {
                ...req,
                employeeId: req.employeeId?.id || 0,
                employeeName: req.employeeId?.name || '',
                typeId: req.typeId?.id || 0,
                typeName: req.typeId?.name || '',
            } as LeaveRequest;
        });
    }

    /** Helper for Who's Out: Fetch team leaves overlapping the upcoming week */
    async getTeamUpcomingLeaves(departmentId: number): Promise<LeaveRequest[]> {
        const todayStr = new Date().toISOString().slice(0, 10) + ' 00:00:00';

        let nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 14); // Next 14 days
        const nextWeekStr = nextWeek.toISOString().slice(0, 10) + ' 23:59:59';

        const domain: OdooDomain = [
            ['department_id', '=', departmentId],
            ['state', '=', 'validate'],
            ['request_date_from', '<=', nextWeekStr],
            ['request_date_to', '>=', todayStr],
        ];

        const fields = getOdooFields(leaveRequestFieldMap);
        const raw = await this.client.searchRead<Record<string, unknown>>(
            LEAVE_MODEL,
            domain,
            fields,
            { limit: 50, order: 'request_date_from asc' }
        );

        return raw.map(r => {
            const req = mapFromOdoo<any>(r, leaveRequestFieldMap);
            return {
                ...req,
                employeeId: req.employeeId?.id || 0,
                employeeName: req.employeeId?.name || '',
                typeId: req.typeId?.id || 0,
                typeName: req.typeId?.name || '',
            } as LeaveRequest;
        });
    }

    /** Get all available leave types */
    async getLeaveTypes(): Promise<Array<{ id: number, name: string }>> {
        const raw = await this.client.searchRead<{ id: number; name: string }>(
            'hr.leave.type',
            [],
            ['id', 'name']
        );
        return raw;
    }

    /** Get upcoming approved leaves for the specific employee */
    async getMyUpcomingLeaves(employeeId: number): Promise<LeaveRequest[]> {
        const todayStr = new Date().toISOString().slice(0, 10) + ' 00:00:00';

        const domain: OdooDomain = [
            ['employee_id', '=', employeeId],
            ['state', '=', 'validate'],
            ['request_date_from', '>=', todayStr],
        ];

        const fields = getOdooFields(leaveRequestFieldMap);
        const raw = await this.client.searchRead<Record<string, unknown>>(
            LEAVE_MODEL,
            domain,
            fields,
            { limit: 20, order: 'request_date_from asc' }
        );

        return raw.map(r => {
            const req = mapFromOdoo<any>(r, leaveRequestFieldMap);
            return {
                ...req,
                employeeId: req.employeeId?.id || 0,
                employeeName: req.employeeId?.name || '',
                typeId: req.typeId?.id || 0,
                typeName: req.typeId?.name || '',
            } as LeaveRequest;
        });
    }

    /** Submit a new leave request */
    async createLeaveRequest(data: {
        holiday_status_id: number;
        request_date_from: string;
        request_date_to: string;
        name: string;
        employee_id?: number;
    }): Promise<number> {
        return this.client.callKw<number>(LEAVE_MODEL, 'create', [data]);
    }

    /** Delete a leave request */
    async deleteLeaveRequest(leaveId: number): Promise<boolean> {
        return this.client.callKw<boolean>(LEAVE_MODEL, 'unlink', [[leaveId]]);
    }
}
