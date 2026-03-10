import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file." }, { status: 400 });
    }

    if (!file.type || !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image uploads are supported." },
        { status: 400 },
      );
    }

    const safeName = (file.name || "recipe-image").replace(/[^\w.\-]+/g, "-");
    const pathname = `recipes/${Date.now()}-${safeName}`;

    const blob = await put(pathname, file, {
      access: "private",
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err: unknown) {
    const message =
      (err as { message?: string })?.message ?? "Failed to upload image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

