// Module registration
export { salesModule } from './module.js';

// Domain types
export type { SalesRecord } from './types.js';

// Mappings (useful for field-map extensions)
export { salesFieldMap } from './mappings.js';

// Repository (for sub-modules and custom use cases)
export { SalesRepository } from './repository.js';

// Hooks
export { useSalesRecords } from './hooks.js';

// Screens
export { default as SalesMainScreen } from './screens/MainScreen.js';

// Dashboard Widgets
export { default as SalesModuleCard } from './widgets/SalesModuleCard.js';
