/**
 * Portal module contract.
 *
 * Each feature (attendance, sales, etc.) implements this interface
 * to register itself with the app shell. The shell auto-discovers
 * modules and shows only those the user has access to.
 */
export interface PortalModule {
    /** Unique module identifier, e.g. 'attendance' */
    id: string;
    /** Display name, e.g. 'Attendance' */
    name: string;
    /** Icon name (from your icon set), e.g. 'clock' */
    icon: string;
    /** Odoo models this module requires. Used to check if module is available. */
    requiredModels: string[];
    /** Odoo user groups required for access. Empty = all authenticated users. */
    requiredGroups?: string[];
    /** Routes this module contributes to the app */
    routes: PortalRouteConfig[];
}

/** Route configuration for a module screen */
export interface PortalRouteConfig {
    /** Route path, e.g. '/attendance' */
    path: string;
    /** Screen title for header/nav */
    title: string;
    /** Optional icon for navigation items */
    icon?: string;
    /** Whether to show this route in the main navigation (tab bar / drawer) */
    showInNav?: boolean;
}

/** Generic component type — avoids React dependency in types package */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ScreenComponent = (props: any) => unknown;

/** Module registration entry — module + lazy component loader */
export interface ModuleRegistration {
    module: PortalModule;
    /** Lazy load the module's screen components */
    loadScreens: () => Promise<Record<string, ScreenComponent>>;
}
