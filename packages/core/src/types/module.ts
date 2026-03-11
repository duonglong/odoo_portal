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

/**
 * A widget that a module contributes to the dashboard.
 *
 * The dashboard auto-discovers widgets from accessible modules,
 * so each user only sees widgets matching their Odoo groups.
 */
export interface DashboardWidget {
    /** Unique widget ID, e.g. 'attendance-hours-today' */
    id: string;
    /** Display order — lower number = shown first (default: 50) */
    order: number;
    /** Metric card component for the top KPI row (optional) */
    MetricCard?: ScreenComponent;
    /** Quick-info card component for the modules section (optional) */
    ModuleCard?: ScreenComponent;
}

/** Module registration entry — module + lazy component loader */
export interface ModuleRegistration {
    module: PortalModule;
    /** Lazy load the module's screen components */
    loadScreens: () => Promise<Record<string, ScreenComponent>>;
    /** Optional dashboard widgets — auto-discovered by the home screen */
    dashboardWidgets?: DashboardWidget[];
}
