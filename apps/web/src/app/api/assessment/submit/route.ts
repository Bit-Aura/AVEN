import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { skillId, answer } = await req.json();

    // Mock evaluation logic for the hackathon
    // If answer contains 'def', we consider it passing (Python specific)
    const isCorrect = answer.toLowerCase().includes('def');

    if (isCorrect) {
      return NextResponse.json({
        isCorrect: true,
        feedback: "Great job! You successfully implemented the required logic. Confidence score updated."
      });
    } else {
      return NextResponse.json({
        isCorrect: false,
        feedback: "Syntax error or incorrect logic. Initiating root-cause backtrace to find missing prerequisites..."
      });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 });
  }
}
