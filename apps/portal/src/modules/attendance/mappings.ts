import type { FieldMap } from '@odoo-portal/odoo-client';

/**
 * Field mapping: hr.attendance
 * Maps clean domain names → Odoo field names.
 */
export const attendanceFieldMap: FieldMap = {
    id: 'id',
    employeeId: 'employee_id',
    checkIn: 'check_in',
    checkOut: 'check_out',
    workedHours: 'worked_hours',
};

/**
 * Field mapping: hr.employee
 */
export const employeeFieldMap: FieldMap = {
    id: 'id',
    name: 'name',
    jobTitle: 'job_title',
    departmentId: 'department_id',
    attendanceState: 'attendance_state',
};

/**
 * Field mapping: hr.leave
 */
export const leaveRequestFieldMap: FieldMap = {
    id: 'id',
    employeeId: 'employee_id', // Note: mapFromOdoo handles Many2One [id, name]
    typeId: 'holiday_status_id',
    startDate: 'request_date_from',
    endDate: 'request_date_to',
    duration: 'number_of_days',
    status: 'state',
    description: 'name',
};

/**
 * Field mapping: hr.leave.allocation
 */
export const leaveAllocationFieldMap: FieldMap = {
    id: 'id',
    typeId: 'holiday_status_id',
    maxLeaves: 'max_leaves',
    leavesTaken: 'leaves_taken',
};
