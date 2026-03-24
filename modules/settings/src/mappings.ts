import type { FieldMap } from '@odoo-portal/odoo-client';

export const userFieldMap: FieldMap = {
    id: 'id',
    name: 'name',
    login: 'login',
    partnerId: 'partner_id',
    companyId: 'company_id',
    image1920: 'image_1920'
};

export const partnerFieldMap: FieldMap = {
    id: 'id',
    name: 'name',
    email: 'email',
    companyName: 'company_name',
    taxId: 'vat',
    website: 'website',
    street: 'street',
    city: 'city',
    stateId: 'state_id',
    zip: 'zip',
    countryId: 'country_id',

};

export const employeeFieldMap: FieldMap = {
    id: 'id',
    name: 'name',
    jobPosition: 'job_id',
};
