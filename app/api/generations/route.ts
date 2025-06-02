import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No authorization token provided" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    
    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam) : 10;

    // Get user's generations from Firestore
    const generationsRef = adminDb.collection("generations");
    const query = generationsRef
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit);

    const snapshot = await query.get();
    
    const generations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ generations });
  } catch (error) {
    console.error("Error fetching generations:", error);
    
    if (error instanceof Error && error.message.includes("auth")) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
} 