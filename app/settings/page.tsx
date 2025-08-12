'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { HiArrowLeft, HiServer, HiCog6Tooth, HiInformationCircle, HiCheckCircle, HiExclamationTriangle } from 'react-icons/hi2';

export default function Settings() {
  const { theme } = useTheme();
  const [lmStudioUrl, setLmStudioUrl] = useState('http://localhost:1234/v1');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [modelCount, setModelCount] = useState(0);

  // 設定を読み込み
  useEffect(() => {
    const savedUrl = localStorage.getItem('lm-studio-url');
    const savedTemp = localStorage.getItem('lm-temperature');
    const savedTokens = localStorage.getItem('lm-max-tokens');
    
    if (savedUrl) setLmStudioUrl(savedUrl);
    if (savedTemp) setTemperature(parseFloat(savedTemp));
    if (savedTokens) setMaxTokens(parseInt(savedTokens));
  }, []);

  // 接続テスト
  const testConnection = async () => {
    setConnectionStatus('checking');
    try {
      const response = await fetch(`/api/models?lmStudioUrl=${encodeURIComponent(lmStudioUrl)}`);
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

  // 接続テストを実行
  useEffect(() => {
    testConnection();
  }, [lmStudioUrl]);

  // 設定を保存
  const saveSettings = () => {
    localStorage.setItem('lm-studio-url', lmStudioUrl);
    localStorage.setItem('lm-temperature', temperature.toString());
    localStorage.setItem('lm-max-tokens', maxTokens.toString());
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
            LM Studio サーバー設定
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                サーバーURL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={lmStudioUrl}
                  onChange={(e) => setLmStudioUrl(e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <button
                  onClick={testConnection}
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
                >
                  接続テスト
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