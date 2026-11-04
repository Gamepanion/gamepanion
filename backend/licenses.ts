// The third-party packages Gamepanion ships, with their licenses (#48): third-party-licenses.json, made by `npm run licenses` before the build (not committed).
import list from "../third-party-licenses.json";

export type ThirdPartyLicense = { name: string; version: string | null; license: string | null; repository: string | null; text: string | null };
export const thirdPartyLicenses = list as ThirdPartyLicense[];

/** Gamepanion's own license and where its source is (AGPL-3.0 §13: whoever uses it over a network can get the source). */
export const OWN_LICENSE = { name: "Gamepanion", license: "AGPL-3.0-only", source: "https://github.com/gamepanion/gamepanion" };
