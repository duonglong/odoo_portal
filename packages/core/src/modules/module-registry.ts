import type { PortalModule, ModuleRegistration } from '@odoo-portal/types';

/**
 * Registry for portal feature modules.
 *
 * Modules register themselves here. The app shell reads the registry
 * to generate navigation and load screens dynamically.
 */
class ModuleRegistryImpl {
    private modules = new Map<string, ModuleRegistration>();

    /** Register a feature module */
    register(registration: ModuleRegistration): void {
        if (this.modules.has(registration.module.id)) {
            console.warn(
                `[ModuleRegistry] Module "${registration.module.id}" is already registered. Overwriting.`,
            );
        }
        this.modules.set(registration.module.id, registration);
    }

    /** Unregister a module by ID */
    unregister(moduleId: string): void {
        this.modules.delete(moduleId);
    }

    /** Get all registered modules */
    getAll(): ModuleRegistration[] {
        return Array.from(this.modules.values());
    }

    /** Get a specific module by ID */
    get(moduleId: string): ModuleRegistration | undefined {
        return this.modules.get(moduleId);
    }

    /**
     * Get modules accessible to a user based on their Odoo groups.
     *
     * @param userGroupIds - The user's Odoo group XML IDs (e.g. ['base.group_user', 'hr.group_hr_user'])
     */
    getAccessible(userGroupIds: string[]): ModuleRegistration[] {
        return this.getAll().filter((reg) => {
            const required = reg.module.requiredGroups;
            // No required groups = accessible to all
            if (!required || required.length === 0) return true;
            // User must have at least one of the required groups
            return required.some((group) => userGroupIds.includes(group));
        });
    }

    /** Clear all registrations (useful for testing) */
    clear(): void {
        this.modules.clear();
    }
}

/** Global module registry singleton */
export const ModuleRegistry = new ModuleRegistryImpl();
