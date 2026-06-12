import { getCurrentDataset } from "@/app/lib/data-store";

export async function GET() {
  return Response.json(
    await getCurrentDataset(),
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
