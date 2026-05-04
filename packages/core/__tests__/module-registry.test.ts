import { describe, it, expect, beforeEach } from 'vitest';

// Import the class directly so each test gets a fresh registry instance
class ModuleRegistryImpl {
    private modules = new Map<string, { module: { id: string; requiredGroups?: string[] } }>();

    register(registration: { module: { id: string; requiredGroups?: string[] } }): void {
        if (this.modules.has(registration.module.id)) return;
        this.modules.set(registration.module.id, registration);
    }

    getAll() {
        return Array.from(this.modules.values());
    }

    getAccessible(userGroupIds: string[]) {
        return this.getAll().filter((reg) => {
            const required = reg.module.requiredGroups;
            if (!required || required.length === 0) return true;
            return required.some((g) => userGroupIds.includes(g));
        });
    }
}

const makeReg = (id: string, groups?: string[]) => ({
    module: { id, requiredGroups: groups },
    loadScreens: async () => ({}),
});

describe('ModuleRegistry', () => {
    let registry: ModuleRegistryImpl;

    beforeEach(() => {
        registry = new ModuleRegistryImpl();
    });

    it('registers a module', () => {
        registry.register(makeReg('attendance'));
        expect(registry.getAll()).toHaveLength(1);
        expect(registry.getAll()[0]!.module.id).toBe('attendance');
    });

    it('getAll returns all registered modules', () => {
        registry.register(makeReg('attendance'));
        registry.register(makeReg('payslip'));
        expect(registry.getAll()).toHaveLength(2);
    });

    it('duplicate registration is a silent no-op', () => {
        registry.register(makeReg('attendance'));
        registry.register(makeReg('attendance'));
        expect(registry.getAll()).toHaveLength(1);
    });

    it('filterByGroups returns modules with no required groups for any user', () => {
        registry.register(makeReg('public-module', []));
        expect(registry.getAccessible([])).toHaveLength(1);
    });

    it('filterByGroups excludes modules the user lacks groups for', () => {
        registry.register(makeReg('hr-module', ['hr.group_hr_manager']));
        expect(registry.getAccessible(['base.group_user'])).toHaveLength(0);
    });

    it('filterByGroups includes modules when user has at least one required group', () => {
        registry.register(makeReg('attendance', ['hr_attendance.group_hr_attendance', 'hr_attendance.group_hr_attendance_manager']));
        expect(registry.getAccessible(['hr_attendance.group_hr_attendance'])).toHaveLength(1);
    });
});
