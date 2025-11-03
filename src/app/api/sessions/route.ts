import { connectDB } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = await connectDB();
    // Find all sessions and sort them by start time
    const sessions = await db.collection('sessions').find({}).sort({ startTime: 1 }).toArray();
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessions = await req.json();
    const db = await connectDB();
    const collection = db.collection('sessions');
    
    // "Replace all" logic: Delete all existing sessions
    await collection.deleteMany({});
    
    // Insert the new, complete list of sessions
    if (sessions && sessions.length > 0) {
      await collection.insertMany(sessions);
    }
    
    return NextResponse.json({ success: true, count: sessions.length || 0 });
  } catch (error) {
    console.error('Error saving sessions:', error);
    return NextResponse.json({ error: 'Failed to save sessions' }, { status: 500 });
  }
}