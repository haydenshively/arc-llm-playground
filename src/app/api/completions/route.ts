import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Assuming your backend service URL
  const backendUrl = "http://localhost:8000/v1/completions";

  try {
    // Forward the request to your backend service
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add any other headers your backend requires
      },
      body: JSON.stringify(await req.json()),
    });

    // Check if the backend response is okay
    if (!backendResponse.ok) {
      throw new Error(
        `Backend responded with status: ${backendResponse.status}`
      );
    }

    // Create a TransformStream to forward the response
    const transformStream = new TransformStream();
    const writer = transformStream.writable.getWriter();

    // Start piping the backend response to the transform stream
    (async () => {
      const reader = backendResponse.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get reader from backend response");
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } finally {
        reader.releaseLock();
        writer.close();
      }
    })();

    // Return the streaming response
    return new NextResponse(transformStream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in stream route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
