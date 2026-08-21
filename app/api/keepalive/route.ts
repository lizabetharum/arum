// Pinged daily by the Vercel cron (see vercel.json) so a serverless Postgres
// free tier doesn't suspend from inactivity.
import { prisma } from "@/lib/db";

export async function GET() {
  await prisma.$queryRaw`SELECT 1`;
  return Response.json({ ok: true });
}
