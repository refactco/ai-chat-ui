import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // Mock response - in a real implementation, this would be replaced with actual logic
    const mockResponse = {
      response: `This is a mock response to your message: "${message}"`,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(mockResponse);
  } catch (error) {
    console.log({ error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
