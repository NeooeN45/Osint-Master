// ============================================================================
// INDEX DES MODULES USERNAME
// ============================================================================

import { OSINTModule } from "../types";
import { sherlockModule } from "./sherlock";
import { maigretModule } from "./maigret";

export const usernameModules: OSINTModule[] = [
  sherlockModule,
  maigretModule
];

export { sherlockModule, maigretModule };
