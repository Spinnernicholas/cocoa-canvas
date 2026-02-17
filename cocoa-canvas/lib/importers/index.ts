/**
 * Voter File Importer Registry
 * 
 * This module auto-registers all available voter file importers
 * and exports the registry for use by the API.
 */

import { importerRegistry } from './registry';
import { contraCostaImporter } from './contra-costa';
import { simpleCsvImporter } from './simple-csv';

// Register all importers
importerRegistry.register(simpleCsvImporter);
importerRegistry.register(contraCostaImporter);

// TODO: Register additional importers as they are implemented
// import { alamedaImporter } from './alameda';
// importerRegistry.register(alamedaImporter);
//
// import { losAngelesImporter } from './los-angeles';
// importerRegistry.register(losAngelesImporter);
//
// import { sanFranciscoImporter } from './san-francisco';
// importerRegistry.register(sanFranciscoImporter);

// Export the registry
export { importerRegistry };

// Re-export types
export * from './types';
export * from './registry';
