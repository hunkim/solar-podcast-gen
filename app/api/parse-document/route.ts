import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.UPSTAGE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 Starting document parse request...");
    console.log("🔑 API Key present:", !!API_KEY);
    console.log("🔑 API Key first/last chars:", API_KEY ? `${API_KEY.substring(0, 3)}...${API_KEY.substring(API_KEY.length - 4)}` : 'N/A');
    
    const formData = await request.formData();
    const file = formData.get("document") as File;
    
    if (!file) {
      console.log("❌ No file provided");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log("📄 File details:", {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Convert file to arrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("📦 Buffer size:", buffer.length);

    // Create FormData exactly like Python requests
    const upstageFormData = new FormData();
    
    // Create a Blob from the buffer to mimic file upload
    const blob = new Blob([buffer], { type: file.type });
    upstageFormData.append("document", blob, file.name);
    upstageFormData.append("ocr", "force");
    upstageFormData.append("base64_encoding", "['table']");
    upstageFormData.append("model", "document-parse");

    console.log("🚀 Making request to Upstage API...");
    console.log("🎯 Endpoint: https://api.upstage.ai/v1/document-digitization");

    // Make the request to Upstage API
    const response = await fetch("https://api.upstage.ai/v1/document-digitization", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        // Don't set Content-Type, let the browser set it for FormData
      },
      body: upstageFormData,
    });

    console.log("📊 Response status:", response.status);
    console.log("📋 Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Upstage API error details:", {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText
      });
      
      return NextResponse.json(
        { 
          error: `Upstage API error: ${response.status} ${response.statusText}`,
          details: errorText 
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log("✅ Success! Response received");
    return NextResponse.json(result);
    
  } catch (error) {
    console.error("💥 Error in parse-document API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 