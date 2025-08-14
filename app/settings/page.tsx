'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { HiArrowLeft, HiServer, HiCog6Tooth, HiInformationCircle, HiCheckCircle, HiExclamationTriangle, HiGlobeAlt } from 'react-icons/hi2';
import { getCurrentEnvironment, saveEnvironment, getEnvironmentUrl, testEnvironmentConnection, type Environment } from '@/lib/lm-studio-config';

export default function Settings() {
  const { theme } = useTheme();
  // 環境設定
  const [currentEnvironment, setCurrentEnvironment] = useState<Environment>(() => getCurrentEnvironment());
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [modelCount, setModelCount] = useState(0);
  
  // プロキシ設定
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState(8080);
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');
  const [proxyTestStatus, setProxyTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // 設定を読み込み
  useEffect(() => {
    const savedTemp = localStorage.getItem('lm-temperature');
    const savedTokens = localStorage.getItem('lm-max-tokens');
    
    // プロキシ設定を読み込み
    const savedProxyEnabled = localStorage.getItem('proxy-enabled');
    const savedProxyHost = localStorage.getItem('proxy-host');
    const savedProxyPort = localStorage.getItem('proxy-port');
    const savedProxyUsername = localStorage.getItem('proxy-username');
    const savedProxyPassword = localStorage.getItem('proxy-password');
    
    if (savedTemp) setTemperature(parseFloat(savedTemp));
    if (savedTokens) setMaxTokens(parseInt(savedTokens));
    
    if (savedProxyEnabled) setProxyEnabled(savedProxyEnabled === 'true');
    if (savedProxyHost) setProxyHost(savedProxyHost);
    if (savedProxyPort) setProxyPort(parseInt(savedProxyPort));
    if (savedProxyUsername) setProxyUsername(savedProxyUsername);
    if (savedProxyPassword) setProxyPassword(savedProxyPassword);
    
    // 初期接続テスト
    testConnection();
  }, [currentEnvironment]);

  // プロキシテスト
  const testProxy = async () => {
    if (!proxyEnabled || !proxyHost) return;
    
    setProxyTestStatus('testing');
    try {
      // プロキシ設定をサーバに送信してテスト
      const response = await fetch('/api/proxy-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proxyHost,
          proxyPort,
          proxyUsername,
          proxyPassword,
        }),
      });
      
      if (response.ok) {
        setProxyTestStatus('success');
      } else {
        setProxyTestStatus('error');
      }
    } catch (error) {
      setProxyTestStatus('error');
    }
  };

  // 接続テスト
  const testConnection = async () => {
    setConnectionStatus('checking');
    try {
      // プロキシ設定を含めてテスト
      const proxyParams = proxyEnabled ? {
        proxyEnabled: true,
        proxyHost,
        proxyPort,
        proxyUsername,
        proxyPassword,
      } : { proxyEnabled: false };
      
      const url = getEnvironmentUrl(currentEnvironment);
      const response = await fetch(`/api/models?lmStudioUrl=${encodeURIComponent(url)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proxyParams),
      });
      const data = await response.json();
      
      if (response.ok && data.models) {
        setConnectionStatus('connected');
        setModelCount(data.models.length);
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      setConnectionStatus('error');
    }
  };

  // 環境変更ハンドラ
  const handleEnvironmentChange = (environment: Environment) => {
    setCurrentEnvironment(environment);
    saveEnvironment(environment);
    testConnection();
  };

  // 設定を保存
  const saveSettings = () => {
    localStorage.setItem('lm-temperature', temperature.toString());
    localStorage.setItem('lm-max-tokens', maxTokens.toString());
    
    // プロキシ設定を保存
    localStorage.setItem('proxy-enabled', proxyEnabled.toString());
    localStorage.setItem('proxy-host', proxyHost);
    localStorage.setItem('proxy-port', proxyPort.toString());
    localStorage.setItem('proxy-username', proxyUsername);
    localStorage.setItem('proxy-password', proxyPassword);
    
    alert('設定を保存しました');
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* ヘッダー */}
      <header className={`p-4 border-b ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.href = '/'}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <HiCog6Tooth className="w-6 h-6 text-blue-900" />
          <h1 className="text-xl font-semibold">設定</h1>
        </div>
      </header>

      {/* 設定コンテンツ */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* LM Studio接続設定 */}
        <div className={`p-6 rounded-lg border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <HiServer className="w-5 h-5" />
            LM Studio サーバ設定
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                実行環境
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleEnvironmentChange('development')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    currentEnvironment === 'development'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : theme === 'dark'
                        ? 'border-gray-600 hover:border-blue-500 hover:bg-gray-700'
                        : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <div className="font-medium">開発環境</div>
                  <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    localhost:1234
                  </div>
                </button>
                <button
                  onClick={() => handleEnvironmentChange('container')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    currentEnvironment === 'container'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : theme === 'dark'
                        ? 'border-gray-600 hover:border-green-500 hover:bg-gray-700'
                        : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
                  }`}
                >
                  <div className="font-medium">コンテナ環境</div>
                  <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    host.docker.internal:1234
                  </div>
                </button>
              </div>
            </div>

            {/* 接続ステータス */}
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              connectionStatus === 'connected' 
                ? theme === 'dark' ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-700'
                : connectionStatus === 'error'
                ? theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-700'
                : theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
            }`}>
              {connectionStatus === 'connected' ? (
                <>
                  <HiCheckCircle className="w-5 h-5" />
                  <span>接続成功 - {modelCount}個のモデルが利用可能</span>
                </>
              ) : connectionStatus === 'error' ? (
                <>
                  <HiExclamationTriangle className="w-5 h-5" />
                  <span>接続失敗 - LM Studioが起動していることを確認してください</span>
                </>
              ) : (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>接続確認中...</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* プロキシ設定 */}
        <div className={`p-6 rounded-lg border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <HiGlobeAlt className="w-5 h-5" />
            プロキシ設定（社内LAN環境用）
          </h2>
          
          <div className="space-y-4">
            {/* プロキシ有効化 */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="proxy-enabled"
                checked={proxyEnabled}
                onChange={(e) => setProxyEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-900 bg-gray-100 border-gray-300 rounded focus:ring-blue-900"
              />
              <label htmlFor="proxy-enabled" className={`text-sm font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                プロキシサーバを使用する
              </label>
            </div>

            {proxyEnabled && (
              <>
                {/* プロキシホスト・ポート */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      プロキシホスト
                    </label>
                    <input
                      type="text"
                      value={proxyHost}
                      onChange={(e) => setProxyHost(e.target.value)}
                      placeholder="proxy.company.com"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      ポート
                    </label>
                    <input
                      type="number"
                      value={proxyPort}
                      onChange={(e) => setProxyPort(parseInt(e.target.value) || 8080)}
                      placeholder="8080"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                {/* プロキシ認証 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      ユーザー名（オプション）
                    </label>
                    <input
                      type="text"
                      value={proxyUsername}
                      onChange={(e) => setProxyUsername(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      パスワード（オプション）
                    </label>
                    <input
                      type="password"
                      value={proxyPassword}
                      onChange={(e) => setProxyPassword(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                {/* プロキシテストボタン */}
                <div className="flex gap-2">
                  <button
                    onClick={testProxy}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    プロキシをテスト
                  </button>
                </div>

                {/* プロキシテスト結果 */}
                {proxyTestStatus !== 'idle' && (
                  <div className={`p-3 rounded-lg flex items-center gap-2 ${
                    proxyTestStatus === 'success' 
                      ? theme === 'dark' ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-700'
                      : proxyTestStatus === 'error'
                      ? theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-700'
                      : theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {proxyTestStatus === 'success' ? (
                      <>
                        <HiCheckCircle className="w-5 h-5" />
                        <span>プロキシ接続成功</span>
                      </>
                    ) : proxyTestStatus === 'error' ? (
                      <>
                        <HiExclamationTriangle className="w-5 h-5" />
                        <span>プロキシ接続失敗 - 設定を確認してください</span>
                      </>
                    ) : (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        <span>プロキシをテスト中...</span>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Docker用の注意書き */}
            <div className={`p-4 rounded-lg border-l-4 border-blue-500 ${
              theme === 'dark' ? 'bg-blue-900/20 text-blue-200' : 'bg-blue-50 text-blue-900'
            }`}>
              <div className="flex items-start gap-2">
                <HiInformationCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium mb-1">環境設定について</p>
                  <p>
                    実行環境を選択することで、LM Studio への接続先が自動設定されます。
                    起動時に自動判定されますが、こちらで手動変更も可能です。
                    プロキシが必要な場合は上記設定を有効にしてください。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LLMパラメータ設定 */}
        <div className={`p-6 rounded-lg border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <HiCog6Tooth className="w-5 h-5" />
            デフォルトLLMパラメータ
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Temperature: {temperature}
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>一貫性重視 (0.1)</span>
                <span>創造性重視 (1.0)</span>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                最大トークン数: {maxTokens}
              </label>
              <input
                type="range"
                min="500"
                max="4000"
                step="100"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>短い回答 (500)</span>
                <span>長い回答 (4000)</span>
              </div>
            </div>
          </div>
        </div>

        {/* アプリ情報 */}
        <div className={`p-6 rounded-lg border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <HiInformationCircle className="w-5 h-5" />
            アプリ情報
          </h2>
          
          <div className={`space-y-2 text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <p>バージョン: 1.0.0</p>
            <p>LM Studioとの接続により、ローカルLLMを使用したAIチャットが可能です</p>
            <p>学習用メタデータ表示により、AIの処理性能を可視化できます</p>
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            className="px-6 py-3 bg-blue-900 text-white rounded-full hover:bg-blue-800 transition-colors"
          >
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );
}