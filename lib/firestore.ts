import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GenerationProgress, PodcastOutline } from "@/lib/podcast-generator";

export interface GenerationRecord {
  id: string;
  userId: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  progress: GenerationProgress | null;
  content: {
    originalContent: string;
    instructions: string;
    inputType: string;
    documentMetadata?: any;
  };
  result?: {
    outline?: PodcastOutline;
    finalScript?: string;
    audioUrl?: string;
    audioId?: string;
    audioMetadata?: {
      duration?: number;
      fileSize?: number;
      format?: string;
    };
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  error?: string;
}

export interface UserStats {
  totalGenerations: number;
  completedGenerations: number;
  totalCharactersProcessed: number;
  lastGenerationAt?: Timestamp;
}

/**
 * Utility function to clean undefined values from objects before sending to Firestore
 */
function cleanFirestoreData(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cleanFirestoreData);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned;
  }
  
  return obj;
}

// Create a new generation record
export async function createGeneration(
  userId: string,
  data: {
    title: string;
    content: string;
    instructions: string;
    inputType: string;
    documentMetadata?: any;
  }
): Promise<string> {
  const generationId = doc(collection(db, "generations")).id;
  
  // Use current timestamp instead of serverTimestamp for immediate availability
  const now = Timestamp.now();
  
  // Prepare content object and clean it for Firestore
  const contentData = cleanFirestoreData({
    originalContent: data.content,
    instructions: data.instructions,
    inputType: data.inputType,
    documentMetadata: data.documentMetadata,
  });
  
  const generationData: Omit<GenerationRecord, "id"> = {
    userId,
    title: data.title,
    status: "pending",
    progress: null,
    content: contentData,
    createdAt: now,
    updatedAt: now,
  };

  // Clean the entire object before sending to Firestore
  const cleanedGenerationData = cleanFirestoreData(generationData);

  await setDoc(doc(db, "generations", generationId), cleanedGenerationData);
  
  // Update user stats
  await updateUserStats(userId, { incrementTotal: true });
  
  return generationId;
}

// Update generation progress
export async function updateGenerationProgress(
  generationId: string,
  progress: GenerationProgress
): Promise<void> {
  const now = Timestamp.now();
  
  const updateData = {
    progress,
    status: progress.progress === 100 ? "completed" : "in_progress",
    updatedAt: now,
    ...(progress.progress === 100 && { completedAt: now }),
    ...(progress.error && { status: "failed", error: progress.error }),
  };

  // Clean the data before sending to Firestore
  const cleanedUpdateData = cleanFirestoreData(updateData);

  await updateDoc(doc(db, "generations", generationId), cleanedUpdateData);
}

// Save generation result
export async function saveGenerationResult(
  generationId: string,
  result: {
    outline?: PodcastOutline;
    finalScript?: string;
  }
): Promise<void> {
  const now = Timestamp.now();
  
  const updateData = {
    result,
    status: "completed",
    completedAt: now,
    updatedAt: now,
  };

  // Clean the data before sending to Firestore
  const cleanedUpdateData = cleanFirestoreData(updateData);

  await updateDoc(doc(db, "generations", generationId), cleanedUpdateData);

  // Get the generation to update user stats
  const generationDoc = await getDoc(doc(db, "generations", generationId));
  if (generationDoc.exists()) {
    const generation = generationDoc.data() as GenerationRecord;
    await updateUserStats(generation.userId, { 
      incrementCompleted: true,
      addCharacters: generation.content.originalContent.length 
    });
  }
}

// Get user's generations
export async function getUserGenerations(
  userId: string,
  limitCount: number = 10
): Promise<GenerationRecord[]> {
  const q = query(
    collection(db, "generations"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as GenerationRecord));
}

// Get specific generation
export async function getGeneration(generationId: string): Promise<GenerationRecord | null> {
  try {
    const docSnap = await getDoc(doc(db, "generations", generationId));
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      
      const result = {
        id: docSnap.id,
        ...data
      } as GenerationRecord;
      
      return result;
    } else {
      return null;
    }
  } catch (error) {
    console.error("❌ Error in getGeneration:", error)
    throw error
  }
}

// Update user statistics
export async function updateUserStats(
  userId: string,
  updates: {
    incrementTotal?: boolean;
    incrementCompleted?: boolean;
    addCharacters?: number;
  }
): Promise<void> {
  const userDocRef = doc(db, "users", userId);
  const userDoc = await getDoc(userDocRef);
  
  const now = Timestamp.now();
  
  if (userDoc.exists()) {
    const currentStats = userDoc.data() as any;
    
    const newStats = {
      lastGenerationAt: now,
      ...(updates.incrementTotal && { 
        totalGenerations: (currentStats.totalGenerations || 0) + 1 
      }),
      ...(updates.incrementCompleted && { 
        completedGenerations: (currentStats.completedGenerations || 0) + 1 
      }),
      ...(updates.addCharacters && { 
        totalCharactersProcessed: (currentStats.totalCharactersProcessed || 0) + updates.addCharacters 
      }),
    };
    
    // Clean the data before sending to Firestore
    const cleanedStats = cleanFirestoreData(newStats);
    
    await updateDoc(userDocRef, cleanedStats);
  }
}

// Get user statistics
export async function getUserStats(userId: string): Promise<UserStats> {
  const userDoc = await getDoc(doc(db, "users", userId));
  
  if (userDoc.exists()) {
    const data = userDoc.data();
    return {
      totalGenerations: data.totalGenerations || 0,
      completedGenerations: data.completedGenerations || 0,
      totalCharactersProcessed: data.totalCharactersProcessed || 0,
      lastGenerationAt: data.lastGenerationAt,
    };
  }
  
  return {
    totalGenerations: 0,
    completedGenerations: 0,
    totalCharactersProcessed: 0,
  };
}

// Delete a generation
export async function deleteGeneration(generationId: string): Promise<void> {
  await deleteDoc(doc(db, "generations", generationId));
}

// Update generation with audio information
export async function updateGenerationWithAudio(
  generationId: string,
  audioData: {
    audioUrl: string;
    audioId: string;
    audioMetadata?: {
      duration?: number;
      fileSize?: number;
      format?: string;
    };
  }
): Promise<void> {
  const now = Timestamp.now();
  
  const updateData = {
    'result.audioUrl': audioData.audioUrl,
    'result.audioId': audioData.audioId,
    'result.audioMetadata': audioData.audioMetadata,
    updatedAt: now,
  };

  const cleanedUpdateData = cleanFirestoreData(updateData);
  await updateDoc(doc(db, "generations", generationId), cleanedUpdateData);
}

// Update generation title
export async function updateGenerationTitle(
  generationId: string,
  newTitle: string
): Promise<void> {
  const now = Timestamp.now();
  
  const updateData = {
    title: newTitle,
    updatedAt: now,
  };

  await updateDoc(doc(db, "generations", generationId), updateData);
} 