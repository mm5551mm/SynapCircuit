import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const ext = file.type.split("/")[1] || "jpg";
  const fileName = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, fileName), buffer);

  return NextResponse.json({ url: `/uploads/${fileName}` });
}
