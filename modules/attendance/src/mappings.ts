import type { FieldMap, ModelMapping } from '@odoo-portal/types';

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
    reason: 'reason',
};

export const attendanceModelMapping: ModelMapping = {
    model: 'hr.attendance',
    fields: attendanceFieldMap,
    defaultOrder: 'check_in desc',
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

export const employeeModelMapping: ModelMapping = {
    model: 'hr.employee',
    fields: employeeFieldMap,
};
