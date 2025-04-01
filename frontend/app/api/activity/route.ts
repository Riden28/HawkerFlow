import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore"

export async function POST(request: Request) {
  try {
    const activityData = await request.json()
    
    // Add activity to Firebase
    const docRef = await addDoc(collection(db, process.env.FIREBASE_DB_NAME || "activity"), {
      userId: activityData.userId,
      action: activityData.action,
      details: activityData.details,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ id: docRef.id })
  } catch (error) {
    console.error("Error logging activity:", error)
    return NextResponse.json(
      { error: "Failed to log activity" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get activities from Firebase
    const activitiesRef = collection(db, process.env.FIREBASE_DB_NAME || "activity")
    const q = query(activitiesRef, orderBy("timestamp", "desc"))
    const querySnapshot = await getDocs(q)
    
    const activities = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return NextResponse.json(activities)
  } catch (error) {
    console.error("Error fetching activities:", error)
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    )
  }
} 