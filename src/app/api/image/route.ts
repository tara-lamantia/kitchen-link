import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies private Vercel Blob image URLs so they can be displayed.
 * Use in img src when the URL is from blob.vercel-storage.com.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!url || !token) {
    return NextResponse.json({ error: "Missing url or token." }, { status: 400 });
  }

  if (!url.includes("blob.vercel-storage.com")) {
    return NextResponse.json({ error: "Invalid url." }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "force-cache",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Blob fetch failed: ${res.status}` },
        { status: res.status },
      );
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: unknown) {
    const message = (err as { message?: string })?.message ?? "Failed to load image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
