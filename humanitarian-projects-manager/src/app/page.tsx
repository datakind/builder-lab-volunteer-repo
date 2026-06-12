import { DashboardClient } from "@/components/DashboardClient";
import { getDashboardModel } from "@/server/db";

export const dynamic = "force-dynamic";

export default function Home() {
  return <DashboardClient model={getDashboardModel()} />;
}
