// Odoo hr.leave models

export interface LeaveType {
    id: number;
    name: string;
    requires_allocation: 'no' | 'yes';
    color_name: string;
}

export interface LeaveAllocation {
    id: number;
    holiday_status_id: [number, string];
    max_leaves: number;
    leaves_taken: number;
}

export interface Leave {
    id: number;
    employee_id: [number, string];
    holiday_status_id: [number, string];
    request_date_from: string;
    request_date_to: string;
    state: 'draft' | 'confirm' | 'refuse' | 'validate1' | 'validate';
    name: string;
}
