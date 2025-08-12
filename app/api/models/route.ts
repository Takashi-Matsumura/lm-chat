import { OpenAI } from 'openai';
import { NextRequest } from 'next/server';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lmStudioUrl = searchParams.get('lmStudioUrl');

    // LM Studio URL を決定 (環境変数またはクエリパラメータから)
    const baseURL = lmStudioUrl || process.env.LM_STUDIO_URL || 'http://localhost:1234/v1';

    // OpenAI クライアントを LM Studio 向けに設定
    const client = new OpenAI({
      apiKey: 'lm-studio', // LM Studio では任意の文字列で OK
      baseURL,
    });

    // LM Studio からモデル一覧を取得
    const modelsResponse = await client.models.list();
    
    const models = modelsResponse.data.map(model => ({
      id: model.id,
      name: model.id,
      object: model.object,
      created: model.created,
    }));

    return Response.json({
      models,
      hasModels: models.length > 0,
    });
  } catch (error) {
    console.error('Models API error:', error);
    
    // LM Studio が起動していない場合のエラーハンドリング
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return Response.json(
        { 
          error: 'LM Studio サーバーに接続できません。LM Studio が起動していることを確認してください。',
          models: [],
          hasModels: false 
        },
        { status: 503 }
      );
    }

    return Response.json(
      { 
        error: 'モデル一覧の取得に失敗しました。',
        models: [],
        hasModels: false 
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lmStudioUrl = searchParams.get('lmStudioUrl');
    const { proxyEnabled, proxyHost, proxyPort, proxyUsername, proxyPassword } = await req.json();

    // LM Studio URL を決定 (環境変数またはクエリパラメータから)
    const baseURL = lmStudioUrl || process.env.LM_STUDIO_URL || 'http://localhost:1234/v1';

    // プロキシ設定
    let httpAgent, httpsAgent;
    if (proxyEnabled && proxyHost && proxyPort) {
      let proxyUrl = `http://${proxyHost}:${proxyPort}`;
      if (proxyUsername && proxyPassword) {
        proxyUrl = `http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
      }
      
      httpAgent = new HttpProxyAgent(proxyUrl);
      httpsAgent = new HttpsProxyAgent(proxyUrl);
    }

    // OpenAI クライアントを LM Studio 向けに設定
    const client = new OpenAI({
      apiKey: 'lm-studio', // LM Studio では任意の文字列で OK
      baseURL,
      // @ts-ignore - Node.js環境でのエージェント設定
      httpAgent,
      httpsAgent,
    });

    // LM Studio からモデル一覧を取得
    const modelsResponse = await client.models.list();
    
    const models = modelsResponse.data.map(model => ({
      id: model.id,
      name: model.id,
      object: model.object,
      created: model.created,
    }));

    return Response.json({
      models,
      hasModels: models.length > 0,
    });
  } catch (error) {
    console.error('Models API error:', error);
    
    // LM Studio が起動していない場合のエラーハンドリング
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return Response.json(
        { 
          error: 'LM Studio サーバーに接続できません。LM Studio が起動していることを確認してください。',
          models: [],
          hasModels: false 
        },
        { status: 503 }
      );
    }

    return Response.json(
      { 
        error: 'モデル一覧の取得に失敗しました。',
        models: [],
        hasModels: false 
      },
      { status: 500 }
    );
  }
}