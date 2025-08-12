import { NextRequest, NextResponse } from 'next/server';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';

export async function POST(request: NextRequest) {
  try {
    const { proxyHost, proxyPort, proxyUsername, proxyPassword } = await request.json();

    if (!proxyHost || !proxyPort) {
      return NextResponse.json({ error: 'プロキシホストとポートが必要です' }, { status: 400 });
    }

    // プロキシURLを構築
    let proxyUrl = `http://${proxyHost}:${proxyPort}`;
    if (proxyUsername && proxyPassword) {
      proxyUrl = `http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
    }

    // プロキシエージェントを作成
    const httpAgent = new HttpProxyAgent(proxyUrl);
    const httpsAgent = new HttpsProxyAgent(proxyUrl);

    // テスト用のHTTP リクエスト (例: httpbin.org)
    const testUrl = 'https://httpbin.org/ip';
    
    const response = await fetch(testUrl, {
      method: 'GET',
      // @ts-ignore - Node.js環境でのエージェント設定
      agent: testUrl.startsWith('https:') ? httpsAgent : httpAgent,
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ 
        success: true, 
        message: 'プロキシ接続成功',
        proxyResponse: data 
      });
    } else {
      return NextResponse.json({ 
        error: 'プロキシ経由のHTTPリクエストが失敗しました' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('プロキシテストエラー:', error);
    return NextResponse.json({ 
      error: 'プロキシ接続に失敗しました' 
    }, { status: 500 });
  }
}