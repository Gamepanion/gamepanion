import { exportDownloadRoute } from "@/backend";

// "Download my data" on the account page (#106): everything the player filed, as one JSON file.
export const GET = exportDownloadRoute;
export const dynamic = "force-dynamic";
