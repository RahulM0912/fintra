import { NextRequest, NextResponse } from 'next/server';
import { processQuery } from '@/lib/gemini';

interface ChatRequest {
    message: string;
    chatId: string
}

interface ChatResponse {
    success: boolean;
    data?: {
        response: string;
        workflow?: any;
        isWorkflow?: boolean;
        isProcessing?: boolean;
    };
    error?: {
        message: string;
        code: string;
    };
}

export async function POST(request: NextRequest) {
    // Generate queryId and create child logger with context
    try {
        const body: ChatRequest = await request.json();
        const userId = request.headers.get('x-user-id');

        if(!userId) {
            return NextResponse.json({
                success: false,
                error: {
                    message: "UnAuthorized",
                    code: "INVALID_REQUEST"
                }
            } as ChatResponse, {status: 401})
        }

        if (!body.message || typeof body.message !== 'string') {
            return NextResponse.json({
                success: false,
                error: {
                    message: 'Message is required and must be a string',
                    code: 'INVALID_REQUEST'
                }
            } as ChatResponse, { status: 400 });
        }

        if (!body.chatId || typeof body.chatId !== 'string') {
            return NextResponse.json({
                success: false,
                error: {
                    message: 'chatId is required and must be a string',
                    code: 'INVALID_REQUEST'
                }
            } as ChatResponse, { status: 400 });
        }
        

        // Create a streaming response
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const result = await processQuery(
                        body.message,
                        body.chatId,
                        userId,
                        undefined, // modelKey (optional)
                    );

                    // Send final result
                    const finalData = JSON.stringify({
                        type: 'final_result',
                        data: {
                            success: result.success,
                            response: result.aiResponse || 'Processing completed',
                            visualData: result.visualData,
                            defaultVisualization: result.defaultVisualization,
                            isProcessing: false,
                            completionReason: result.completionReason
                        }
                    });
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                    controller.close();

                } catch (queryError) {
                    console.error('[API] Query processing failed:', { error: queryError instanceof Error ? queryError.message : String(queryError) });
                    
                    const errorData = JSON.stringify({
                        type: 'error',
                        data: {
                            success: false,
                            error: {
                                message: `Query processing failed: ${queryError instanceof Error ? queryError.message : String(queryError)}`,
                                code: 'QUERY_ERROR'
                            }
                        }
                    });
                    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });

    } catch (error) {
        console.error('[API] Unexpected error in chat API:', { error: error instanceof Error ? error.message : String(error) });

        const errorResponse = {
            success: false,
            error: {
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
                code: 'INTERNAL_SERVER_ERROR'
            }
        } as ChatResponse;

        return NextResponse.json(errorResponse, { status: 500 });
    }
}