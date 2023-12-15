import { Sync } from './utils.js';
export const loadCharacters = async () => {
    await import('../characters/carbon.js');
    await import('../characters/helium.js');
    await import('../characters/iron.js');
    await import('../characters/rhodium.js');
    await import('../characters/silicon.js');
    await import('../characters/xenon.js');
    Sync.loading.done();
};
//# sourceMappingURL=characterloader.js.map