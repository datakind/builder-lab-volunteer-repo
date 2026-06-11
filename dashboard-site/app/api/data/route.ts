import { getCurrentDataset } from "@/app/lib/data-store";

export async function GET() {
  return Response.json(await getCurrentDataset());
}
