/**
 * LM Studio接続設定のユーティリティ関数
 */

export type Environment = 'development' | 'container';

/**
 * 環境設定のストレージキー
 */
const ENVIRONMENT_STORAGE_KEY = 'lm-studio-environment';

/**
 * 保存された環境設定を取得
 */
export function getSavedEnvironment(): Environment | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(ENVIRONMENT_STORAGE_KEY);
  return saved === 'development' || saved === 'container' ? saved : null;
}

/**
 * 環境設定を保存
 */
export function saveEnvironment(environment: Environment): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ENVIRONMENT_STORAGE_KEY, environment);
  }
}

/**
 * 自動環境判定（フォールバック用）
 */
export function detectEnvironment(): Environment {
  // サーバサイドの場合
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'production' && process.env.LM_STUDIO_URL?.includes('host.docker.internal') 
      ? 'container' 
      : 'development';
  }
  
  // クライアントサイドの場合
  return window.location.hostname !== 'localhost' ? 'container' : 'development';
}

/**
 * 環境に基づいてLM Studio URLを取得
 */
export function getEnvironmentUrl(environment: Environment): string {
  switch (environment) {
    case 'container':
      return 'http://host.docker.internal:1234/v1';
    case 'development':
    default:
      return 'http://localhost:1234/v1';
  }
}

/**
 * 現在の環境設定を取得（保存済み設定 > 自動判定）
 */
export function getCurrentEnvironment(): Environment {
  const saved = getSavedEnvironment();
  return saved || detectEnvironment();
}

/**
 * 現在のLM Studio URLを取得
 */
export function getCurrentLMStudioUrl(): string {
  // 環境変数が設定されている場合は最優先
  if (process.env.NEXT_PUBLIC_LM_STUDIO_URL) {
    return process.env.NEXT_PUBLIC_LM_STUDIO_URL;
  }
  
  const environment = getCurrentEnvironment();
  return getEnvironmentUrl(environment);
}

/**
 * APIルート用のLM Studio URLを解決する
 */
export function resolveLMStudioUrl(requestUrl?: string): string {
  if (requestUrl) {
    return requestUrl;
  }
  
  if (process.env.LM_STUDIO_URL) {
    return process.env.LM_STUDIO_URL;
  }
  
  return getCurrentLMStudioUrl();
}

/**
 * 指定した環境でLM Studioへの接続をテスト
 */
export async function testEnvironmentConnection(environment: Environment): Promise<boolean> {
  try {
    const url = getEnvironmentUrl(environment);
    const response = await fetch(`/api/models?lmStudioUrl=${encodeURIComponent(url)}`);
    const data = await response.json();
    return data.hasModels === true;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}