import type { OdooClient } from '../odoo-client.js';
import type { LeaveType, LeaveAllocation, Leave } from '@odoo-portal/types';

export class LeaveRepository {
    constructor(private readonly client: OdooClient) { }

    /**
     * Fetch active leave types that the user can request.
     */
    async getLeaveTypes(): Promise<LeaveType[]> {
        return this.client.searchRead<LeaveType>(
            'hr.leave.type',
            [['requires_allocation', 'in', ['yes', 'no']]], // Basic domain to get viable types
            ['id', 'name', 'requires_allocation', 'color_name']
        );
    }

    /**
     * Fetch the user's leave allocations to calculate remaining balances.
     */
    async getMyBalances(employeeId: number): Promise<LeaveAllocation[]> {
        if (!employeeId) return [];

        // This relies on Odoo's allocation model. Some setups use hr.leave.report
        // for grouped balances, but hr.leave.allocation is the typical source of truth.
        return this.client.searchRead<LeaveAllocation>(
            'hr.leave.allocation',
            [
                ['employee_id', '=', employeeId],
                ['state', '=', 'validate']
            ],
            ['id', 'holiday_status_id', 'max_leaves', 'leaves_taken']
        );
    }

    /**
     * Fetch team leaves overlapping with today/upcoming.
     * In a real enterprise app, you'd filter by department_id or employee's manager.
     */
    async getTeamUpcomingLeaves(departmentId?: number): Promise<Leave[]> {
        const today = new Date().toISOString().split('T')[0];

        const domain: any[] = [
            ['state', 'in', ['confirm', 'validate1', 'validate']],
            ['request_date_to', '>=', today]
        ];

        // Optional: narrow down to the user's department to avoid fetching the whole company
        // if (departmentId) {
        //     domain.push(['department_id', '=', departmentId]);
        // }

        return this.client.searchRead<Leave>(
            'hr.leave',
            domain,
            ['id', 'employee_id', 'holiday_status_id', 'request_date_from', 'request_date_to', 'state', 'name'],
            { limit: 20, order: 'request_date_from ASC' }
        );
    }

    /**
     * Submit a new leave request.
     */
    async createLeaveRequest(data: {
        holiday_status_id: number;
        request_date_from: string;
        request_date_to: string;
        name: string;
    }): Promise<number> {
        return this.client.callKw<number>(
            'hr.leave',
            'create',
            [data],
            {}
        );
    }
}
