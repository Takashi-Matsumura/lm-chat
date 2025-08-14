import { OpenAI } from 'openai';
import { NextRequest } from 'next/server';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import { resolveLMStudioUrl } from '@/lib/lm-studio-config';

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

    // LM Studio URL を決定
    const baseURL = resolveLMStudioUrl(lmStudioUrl);
    
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
      timeout: 30000, // 30秒のタイムアウト
      maxRetries: 3, // 最大3回リトライ
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
              const reasoning = delta?.reasoning || '';
              
              // デバッグログ
              if (reasoning) {
                console.log('Received reasoning data:', reasoning);
              }
              
              if (content || reasoning) {
                const data = JSON.stringify({ content, reasoning });
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
      // gpt-oss モデルの場合、reasoning フィールドを含む
      const formattedResponse = {
        ...response,
        choices: response.choices.map((choice: any) => ({
          ...choice,
          message: {
            ...choice.message,
            reasoning: choice.message?.reasoning || choice.reasoning || '',
          },
        })),
      };
      return Response.json(formattedResponse);
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: 'LM Studio への接続に失敗しました。サーバが起動していることを確認してください。' },
      { status: 500 }
    );
  }
}