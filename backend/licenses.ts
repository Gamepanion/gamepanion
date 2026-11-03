// The third-party packages Gamepanion ships, with their licenses (#48): third-party-licenses.json, made by `npm run generate`.
import list from "../third-party-licenses.json";

export type ThirdPartyLicense = { name: string; version: string | null; license: string | null; repository: string | null; text: string | null };
export const thirdPartyLicenses = list as ThirdPartyLicense[];
