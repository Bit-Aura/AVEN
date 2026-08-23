import { NextResponse } from 'next/server';

// This is a stub for the LangGraph Diagnoser Agent running on the FastAPI backend
export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1].content.toLowerCase();

    // Mock Diagnoser Logic
    if (lastMessage.includes('hours') || lastMessage.includes('week')) {
      return NextResponse.json({
        reply: "Great. I've logged your time budget. I will now write your initial mastery estimates to the graph and generate your personalized learning path.",
        isComplete: true
      });
    }

    return NextResponse.json({
      reply: "Got it. Tell me about your current experience level with this role, and how many hours per week you can dedicate to learning?",
      isComplete: false
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to connect to Diagnoser Agent' }, { status: 500 });
  }
}
