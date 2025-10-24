import { connectDB } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  const db = await connectDB();
  const sessions = await db.collection('sessions').find({}).toArray();
  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const sessions = await req.json();
  const db = await connectDB();
  await db.collection('sessions').insertMany(sessions);
  return NextResponse.json({ success: true });
}