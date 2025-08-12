import { OpenAI } from 'openai';
import { NextRequest } from 'next/server';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      messages, 
      model, 
      temperature = 0.7, 
      max_tokens = 2000, 
      stream = true, 
      lmStudioUrl,
      proxyEnabled,
      proxyHost,
      proxyPort,
      proxyUsername,
      proxyPassword
    } = body;

    // LM Studio URL を決定 (環境変数またはリクエストから)
    const baseURL = lmStudioUrl || process.env.LM_STUDIO_URL || 'http://localhost:1234/v1';
    
    console.log('Using model:', model);
    console.log('Base URL:', baseURL);

    // プロキシ設定
    let httpAgent, httpsAgent;
    if (proxyEnabled && proxyHost && proxyPort) {
      let proxyUrl = `http://${proxyHost}:${proxyPort}`;
      if (proxyUsername && proxyPassword) {
        proxyUrl = `http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
      }
      
      httpAgent = new HttpProxyAgent(proxyUrl);
      httpsAgent = new HttpsProxyAgent(proxyUrl);
      
      console.log('Using proxy:', proxyUrl);
    }

    // OpenAI クライアントを LM Studio 向けに設定
    const client = new OpenAI({
      apiKey: 'lm-studio', // LM Studio では任意の文字列で OK
      baseURL,
      // @ts-ignore - Node.js環境でのエージェント設定
      httpAgent,
      httpsAgent,
    });

    // LM Studio にリクエストを送信
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
      stream,
      // リーズニングモデル用の設定を追加
      ...(model.includes('gpt-oss') && {
        reasoning: true,
        include_thinking: true,
        stream_reasoning: true,
      }),
    });

    if (stream) {
      // ストリーミングレスポンス
      const encoder = new TextEncoder();
      
      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            let isFirstChunk = true;
            for await (const chunk of response as any) {
              // デバッグ: 全チャンクの構造を確認
              if (isFirstChunk) {
                console.log('First chunk structure:', JSON.stringify(chunk, null, 2));
                isFirstChunk = false;
              }
              
              const delta = chunk.choices?.[0]?.delta;
              const content = delta?.content || '';
              const thinking = delta?.thinking || '';
              
              // リーズニングモデルでは異なるフィールドが使われる可能性をチェック
              const reasoningContent = delta?.reasoning || '';
              const thoughtContent = delta?.thought || '';
              
              // デバッグログ
              if (thinking || reasoningContent || thoughtContent) {
                console.log('Received thinking/reasoning data:', {
                  thinking,
                  reasoning: reasoningContent,
                  thought: thoughtContent
                });
              }
              
              if (content || thinking || reasoningContent || thoughtContent) {
                const combinedThinking = thinking || reasoningContent || thoughtContent;
                const data = JSON.stringify({ content, thinking: combinedThinking });
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