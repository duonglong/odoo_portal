import type { OdooClient } from '@odoo-portal/odoo-client';
import { mapFromOdoo, getOdooFields } from '@odoo-portal/odoo-client';
import type { OdooDomain } from '@odoo-portal/odoo-client';
import type { UserProfile } from './types.js';
import { userFieldMap, partnerFieldMap, employeeFieldMap } from './mappings.js';

export class SettingsRepository {
    constructor(private client: OdooClient) { }

    async getProfile(userId: number): Promise<UserProfile> {
        // Fetch User
        const users = await this.client.searchRead<Record<string, unknown>>(
            'res.users',
            [['id', '=', userId]],
            getOdooFields(userFieldMap),
            { limit: 1 }
        );
        if (!users[0]) throw new Error("User not found");
        
        const mappedUser = mapFromOdoo<{
            id: number;
            name: string;
            login: string;
            partnerId: { id: number, name: string } | null;
            companyId: { id: number, name: string } | null;
            image1920: string | null;
        }>(users[0], userFieldMap);

        const partnerId = mappedUser.partnerId?.id;
        if (!partnerId) throw new Error("Partner not found for user");

        // Fetch Partner — wrapped in try/catch because Odoo's ORM may internally
        // join restricted models (e.g. snailmail.letter) via the chatter layer,
        // which portal users cannot access.
        let mappedPartner: any = {};
        try {
            const partners = await this.client.searchRead<Record<string, unknown>>(
                'res.partner',
                [['id', '=', partnerId]],
                getOdooFields(partnerFieldMap),
                { limit: 1 }
            );
            if (partners[0]) {
                mappedPartner = mapFromOdoo(partners[0], partnerFieldMap);
            }
        } catch (e) {
            console.warn('[SettingsRepository] Could not fetch res.partner (likely a permission issue). Partner fields will be omitted.', e);
        }

        // Fetch Employee — wrapped in try/catch because some Odoo instances add
        // restricted custom fields (e.g. version_id) that portal users can't read.
        let mappedEmployee: any = {};
        try {
            const employees = await this.client.searchRead<Record<string, unknown>>(
                'hr.employee',
                [['user_id', '=', userId]],
                getOdooFields(employeeFieldMap),
                { limit: 1 }
            );
            if (employees[0]) {
                mappedEmployee = mapFromOdoo(employees[0], employeeFieldMap);
            }
        } catch (e) {
            console.warn('[SettingsRepository] Could not fetch hr.employee (likely a permission issue). HR fields will be omitted.', e);
        }

        return {
            userId: userId,
            partnerId: partnerId,
            employeeId: mappedEmployee?.id,
            name: mappedUser.name,
            email: mappedPartner?.email || mappedUser.login,
            image1920: mappedUser.image1920,
            jobPosition: mappedEmployee?.jobPosition?.name,
            companyName: mappedPartner?.companyName || mappedUser.companyId?.name,
            taxId: mappedPartner?.taxId,
            website: mappedPartner?.website,
            street: mappedPartner?.street,
            city: mappedPartner?.city,
            stateId: mappedPartner?.stateId ? { id: mappedPartner.stateId.id, name: mappedPartner.stateId.name } : undefined,
            zip: mappedPartner?.zip,
            countryId: mappedPartner?.countryId ? { id: mappedPartner.countryId.id, name: mappedPartner.countryId.name } : undefined,
        };
    }

    async updateProfile(userId: number, partnerId: number, data: Partial<UserProfile>): Promise<boolean> {
        const partnerUpdates: Record<string, any> = {};
        if (data.name !== undefined) partnerUpdates['name'] = data.name;
        if (data.taxId !== undefined) partnerUpdates['vat'] = data.taxId;
        if (data.website !== undefined) partnerUpdates['website'] = data.website;
        if (data.street !== undefined) partnerUpdates['street'] = data.street;
        if (data.city !== undefined) partnerUpdates['city'] = data.city;
        if (data.zip !== undefined) partnerUpdates['zip'] = data.zip;
        
        let success = true;

        if (Object.keys(partnerUpdates).length > 0) {
            success = await this.client.callKw<boolean>('res.partner', 'write', [
                [partnerId],
                partnerUpdates
            ]);
        }

        // We could also update hr.employee if needed (like jobTitle), but partner is safer usually.
        // Omitted employee update for simplicity since non-HR users might lack rights.

        return success;
    }

    async uploadProfileImage(partnerId: number, base64: string): Promise<boolean> {
        return this.client.callKw<boolean>('res.partner', 'write', [
            [partnerId],
            { image_1920: base64 },
        ]);
    }

    async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
        try {
            // Re-authenticate to ensure they know the current password
            // In a real scenario you may also call a specialized controller for password change
            // This requires the standard Odoo endpoint which is not exported by OdooClient easily
            // except through RPC web endpoints. For now we will mock this or throw if not supported.
            throw new Error("Changing password via JSON-RPC is restricted on Odoo by default without writing to res.users, which normal access rights restrict.");
        } catch (e) {
            console.error("Change password failed", e);
            throw e;
        }
    }
}
