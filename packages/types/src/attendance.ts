// Odoo hr.leave models

export interface LeaveType {
    id: number;
    name: string;
    requires_allocation: 'no' | 'yes';
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
    number_of_days: number;
    state: 'draft' | 'confirm' | 'refuse' | 'validate1' | 'validate';
    name: string;
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
