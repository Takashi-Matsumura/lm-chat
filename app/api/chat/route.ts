import { OpenAI } from 'openai';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, temperature = 0.7, max_tokens = 2000, stream = true, lmStudioUrl } = body;

    // LM Studio URL を決定 (環境変数またはリクエストから)
    const baseURL = lmStudioUrl || process.env.LM_STUDIO_URL || 'http://localhost:1234/v1';

    // OpenAI クライアントを LM Studio 向けに設定
    const client = new OpenAI({
      apiKey: 'lm-studio', // LM Studio では任意の文字列で OK
      baseURL,
    });

    // LM Studio にリクエストを送信
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
      stream,
    });

    if (stream) {
      // ストリーミングレスポンス
      const encoder = new TextEncoder();
      
      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of response as any) {
              const content = chunk.choices?.[0]?.delta?.content || '';
              if (content) {
                const data = JSON.stringify({ content });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(streamResponse, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // 非ストリーミングレスポンス
      return Response.json(response);
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: 'LM Studio への接続に失敗しました。サーバーが起動していることを確認してください。' },
      { status: 500 }
    );
  }
}