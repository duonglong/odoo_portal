import type { FieldMap } from '@odoo-portal/types';

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

