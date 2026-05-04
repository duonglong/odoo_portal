import type { FieldMap } from '@odoo-portal/odoo-client';

export const payslipFieldMap: FieldMap = {
    id: 'id',
    name: 'name',
    employeeId: 'employee_id',
    companyId: 'company_id',
    dateFrom: 'date_from',
    dateTo: 'date_to',
    state: 'state',
};

export const payslipLineFieldMap: FieldMap = {
    id: 'id',
    name: 'name',
    code: 'code',
    categoryId: 'category_id',
    sequence: 'sequence',
    quantity: 'quantity',
    rate: 'rate',
    amount: 'amount',
    total: 'total',
    slipId: 'slip_id',
};

export const companyFieldMap: FieldMap = {
    id: 'id',
    name: 'name',
    vat: 'vat',
    email: 'email',
    street: 'street',
    city: 'city',
    stateId: 'state_id',
    zip: 'zip',
};
