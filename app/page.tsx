'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from './contexts/ThemeContext';
import { HiPaperAirplane, HiSun, HiMoon, HiChatBubbleLeftRight, HiExclamationTriangle, HiArrowPath, HiChartBarSquare, HiEye, HiEyeSlash, HiClock, HiBolt, HiCog6Tooth, HiCpuChip, HiClipboardDocumentList, HiLightBulb } from 'react-icons/hi2';
import Markdown from 'markdown-to-jsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string; // このメッセージを生成したLLMモデル名
  thinking?: string; // リーズニングモデルのThinking内容
  reasoning?: string; // gpt-ossモデルのreasoning内容
  metadata?: {
    tokenCount: number;
    responseTime?: number; // ミリ秒
    tokensPerSecond?: number;
    timestamp: number;
  };
}

interface Model {
  id: string;
  name: string;
}

export default function Chat() {
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [error, setError] = useState<string>('');
  // Docker環境では環境変数から、通常環境ではlocalhostを使用
  const defaultUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? 'http://host.docker.internal:1234/v1'
    : 'http://localhost:1234/v1';
  const [lmStudioUrl, setLmStudioUrl] = useState(defaultUrl);
  const [showStats, setShowStats] = useState(true);
  const [tokenizedMessages, setTokenizedMessages] = useState<Set<string>>(new Set());
  const [showThinkingMessages, setShowThinkingMessages] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // トークン分割関数（学習用の簡易版）
  const tokenizeText = (text: string): string[] => {
    const tokens: string[] = [];
    let currentToken = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // 英語・数字の場合
      if (/[a-zA-Z0-9]/.test(char)) {
        currentToken += char;
      } 
      // スペース・改行の場合
      else if (/\s/.test(char)) {
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
        // スペースもトークンとして扱う
        tokens.push(char);
      }
      // 日本語・記号の場合
      else {
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
        // 日本語は1-2文字でトークン化
        if (/[ひらがなカタカナ一-龯]/.test(char)) {
          let jaToken = char;
          // 次の1文字もチェック
          if (i + 1 < text.length && /[ひらがなカタカナ一-龯]/.test(text[i + 1])) {
            jaToken += text[i + 1];
            i++;
          }
          tokens.push(jaToken);
        } else {
          tokens.push(char);
        }
      }
    }
    
    if (currentToken) {
      tokens.push(currentToken);
    }
    
    return tokens;
  };

  // トークン数計算関数（tokenizeTextと同じロジックを使用）
  const estimateTokens = (text: string): number => {
    return tokenizeText(text).length;
  };

  // メッセージのトークン表示を切り替える関数
  const toggleMessageTokenization = (messageId: string) => {
    setTokenizedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // メッセージのThinking表示を切り替える関数
  const toggleMessageThinking = (messageId: string) => {
    setShowThinkingMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // モデルの最大コンテキストサイズを取得する関数
  const getModelMaxContext = (modelId: string): number => {
    const modelContextSizes: { [key: string]: number } = {
      // OpenAI models
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4-turbo': 128000,
      'gpt-4o': 128000,
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384,
      
      // GPT-OSS models
      'openai/gpt-oss-20b': 8192,
      'openai/gpt-oss': 8192,
      
      // Gemma models
      'gemma-2-2b-it': 8192,
      'gemma-2-9b-it': 8192,
      'gemma-2-27b-it': 8192,
      
      // Llama models
      'llama-2-7b': 4096,
      'llama-2-13b': 4096,
      'llama-2-70b': 4096,
      'llama-3-8b': 8192,
      'llama-3-70b': 8192,
      
      // Mistral models
      'mistral-7b': 8192,
      'mistral-8x7b': 32768,
      
      // Claude models (if available)
      'claude-3-haiku': 200000,
      'claude-3-sonnet': 200000,
      'claude-3-opus': 200000,
    };
    
    // 完全一致を探す
    if (modelContextSizes[modelId]) {
      return modelContextSizes[modelId];
    }
    
    // 部分一致を探す
    for (const [key, value] of Object.entries(modelContextSizes)) {
      if (modelId.toLowerCase().includes(key.toLowerCase()) || 
          key.toLowerCase().includes(modelId.toLowerCase())) {
        return value;
      }
    }
    
    // デフォルト値
    return 4096;
  };

  // AIの回答内容を読みやすく前処理する関数
  const preprocessAIContent = (content: string): string => {
    return content
      // <br>タグを改行に変換
      .replace(/<br\s*\/?>/gi, '\n')
      // HTMLタグを除去
      .replace(/<[^>]*>/g, '')
      // 連続する改行を適度に調整
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  // トークンごとの色生成
  const getTokenColor = (index: number, isDark: boolean = false): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];
    return colors[index % colors.length];
  };

  // トークン色分け表示コンポーネント
  const TokenizedText = ({ text, isDark = false }: { text: string; isDark?: boolean }) => {
    const tokens = tokenizeText(text);
    
    return (
      <span>
        {tokens.map((token, index) => {
          // スペース文字の場合は色分けしない
          if (/^\s+$/.test(token)) {
            return <span key={index}>{token}</span>;
          }
          
          return (
            <span
              key={index}
              style={{
                backgroundColor: getTokenColor(index, isDark),
                color: '#000000',
                padding: '2px 4px',
                margin: '0 1px',
                borderRadius: '3px',
                fontSize: '1em',
                fontWeight: '500',
                display: 'inline-block',
              }}
              title={`トークン ${index + 1}: "${token}"`}
            >
              {token}
            </span>
          );
        })}
      </span>
    );
  };

  // 統計情報の計算
  const getSessionStats = () => {
    const assistantMessages = messages.filter(m => m.role === 'assistant' && m.metadata);
    const totalTokens = assistantMessages.reduce((sum, m) => sum + (m.metadata?.tokenCount || 0), 0);
    const totalResponseTime = assistantMessages.reduce((sum, m) => sum + (m.metadata?.responseTime || 0), 0);
    const avgResponseTime = assistantMessages.length > 0 ? totalResponseTime / assistantMessages.length : 0;
    const avgTokensPerSecond = assistantMessages.length > 0 
      ? assistantMessages.reduce((sum, m) => sum + (m.metadata?.tokensPerSecond || 0), 0) / assistantMessages.length 
      : 0;

    // コンテキストウィンドウのトークン数計算
    const contextTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);

    return {
      totalMessages: messages.length,
      assistantMessages: assistantMessages.length,
      totalTokens,
      contextTokens,
      avgResponseTime: Math.round(avgResponseTime),
      avgTokensPerSecond: Math.round(avgTokensPerSecond * 10) / 10,
    };
  };

  // モデル一覧を取得
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`/api/models?lmStudioUrl=${encodeURIComponent(lmStudioUrl)}`);
        const data = await response.json();
        
        if (data.models && data.models.length > 0) {
          setModels(data.models);
          setSelectedModel(data.models[0].id);
          setError('');
        } else {
          setError('LM Studio からモデルを読み込めませんでした。LM Studio が起動していることを確認してください。');
        }
      } catch (err) {
        setError('LM Studio との接続に失敗しました。');
      }
    };

    fetchModels();
  }, [lmStudioUrl]);

  // メッセージの最下部にスクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初回マウント時と送信完了時にフォーカス
  useEffect(() => {
    // 初回マウント時にフォーカス
    inputRef.current?.focus();
  }, []);

  // チャットエリアクリック時のフォーカス処理
  const handleChatAreaClick = (e: React.MouseEvent) => {
    // クリックターゲットがメッセージ内のインタラクティブ要素でない場合のみフォーカス
    const target = e.target as HTMLElement;
    const isInteractiveElement = target.closest('button, a, .cursor-pointer, [role="button"], input, textarea, select');
    
    // テキスト選択中は無視
    const selection = window.getSelection();
    const hasTextSelection = selection && selection.toString().length > 0;
    
    if (!isInteractiveElement && !hasTextSelection && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  };

  // ローディング状態が変化した時にフォーカスを戻す
  useEffect(() => {
    if (!loading && inputRef.current) {
      // 送信完了後にフォーカスを戻す
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [loading]);

  // メッセージ送信
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      metadata: {
        tokenCount: estimateTokens(input),
        timestamp: Date.now(),
      },
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const startTime = Date.now();
    
    try {
      console.log('Sending request with model:', selectedModel);
      
      // プロキシ設定を取得
      const proxyEnabled = localStorage.getItem('proxy-enabled') === 'true';
      const proxyHost = localStorage.getItem('proxy-host') || '';
      const proxyPort = parseInt(localStorage.getItem('proxy-port') || '8080');
      const proxyUsername = localStorage.getItem('proxy-username') || '';
      const proxyPassword = localStorage.getItem('proxy-password') || '';
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          model: selectedModel,
          lmStudioUrl,
          proxyEnabled,
          proxyHost,
          proxyPort,
          proxyUsername,
          proxyPassword,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let assistantContent = '';
      let assistantThinking = '';
      let assistantReasoning = '';
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        model: selectedModel, // 使用したモデル名を保存
        thinking: '',
        reasoning: '',
        metadata: {
          tokenCount: 0,
          responseTime: 0,
          tokensPerSecond: 0,
          timestamp: Date.now(),
        },
      };

      setMessages(prev => [...prev, assistantMessage]);

      let tokenCount = 0;
      const streamStartTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content || parsed.thinking || parsed.reasoning) {
                if (parsed.content) {
                  assistantContent += parsed.content;
                }
                if (parsed.thinking) {
                  console.log('Received thinking:', parsed.thinking);
                  assistantThinking += parsed.thinking;
                }
                if (parsed.reasoning) {
                  console.log('Received reasoning:', parsed.reasoning);
                  assistantReasoning += parsed.reasoning;
                }
                
                tokenCount = estimateTokens(assistantContent);
                
                const currentTime = Date.now();
                const responseTime = currentTime - startTime;
                const tokensPerSecond = tokenCount / (responseTime / 1000);

                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessage.id
                    ? { 
                        ...msg, 
                        content: assistantContent,
                        thinking: assistantThinking,
                        reasoning: assistantReasoning,
                        metadata: {
                          tokenCount,
                          responseTime,
                          tokensPerSecond,
                          timestamp: streamStartTime,
                        }
                      }
                    : msg
                ));
              }
            } catch (e) {
              // JSON parse error, skip
            }
          }
        }
      }

      // 最終的なメタデータ更新
      const finalResponseTime = Date.now() - startTime;
      const finalTokensPerSecond = tokenCount / (finalResponseTime / 1000);
      
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessage.id
          ? { 
              ...msg,
              content: assistantContent,
              thinking: assistantThinking,
              reasoning: assistantReasoning,
              metadata: {
                tokenCount,
                responseTime: finalResponseTime,
                tokensPerSecond: finalTokensPerSecond,
                timestamp: streamStartTime,
              }
            }
          : msg
      ));

    } catch (err) {
      setError('メッセージの送信に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* ヘッダー */}
      <header className={`p-4 border-b ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <HiChatBubbleLeftRight className={`w-8 h-8 ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`} />
            <h1 className="text-xl font-semibold">LM Chat</h1>
            
            {/* モデル選択 */}
            {models.length > 0 && (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className={`px-3 py-1 rounded-md border text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowStats(!showStats);
                // メタデータを非表示にする場合、全てのトークン分けとThinking表示をリセット
                if (showStats) {
                  setTokenizedMessages(new Set());
                  setShowThinkingMessages(new Set());
                }
              }}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              title="メタデータ表示の切り替え"
            >
              {showStats ? <HiEye className="w-5 h-5" /> : <HiEyeSlash className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              {theme === 'light' ? <HiMoon className="w-5 h-5" /> : <HiSun className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 統計バー（全画面幅対応） */}
        {messages.length > 0 && (
          <div className={`px-4 py-2 border-b text-xs ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700 text-white' 
              : 'bg-gray-50 border-gray-200 text-gray-600'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span>{getSessionStats().totalMessages.toLocaleString()}メッセージ</span>
                <span>{getSessionStats().totalTokens.toLocaleString()}トークン（出力）</span>
              </div>
              <div className="flex items-center gap-3">
                <span>{getSessionStats().avgTokensPerSecond.toLocaleString()} t/s</span>
                <span>{getSessionStats().avgResponseTime.toLocaleString()}ms</span>
                <span className={`px-3 py-1 rounded-full font-semibold ${
                  getSessionStats().contextTokens / getModelMaxContext(selectedModel) > 0.8 
                    ? theme === 'dark' 
                      ? 'bg-red-500 text-white' 
                      : 'bg-red-600 text-white'
                    : getSessionStats().contextTokens / getModelMaxContext(selectedModel) > 0.6
                    ? theme === 'dark'
                      ? 'bg-yellow-400 text-black'
                      : 'bg-yellow-500 text-white'
                    : theme === 'dark'
                    ? 'bg-white text-black'
                    : 'bg-black text-white'
                }`}>
                  {getSessionStats().contextTokens.toLocaleString()}/{getModelMaxContext(selectedModel).toLocaleString()}コンテキスト
                </span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* エラー表示 */}
      {error && (
        <div className={`p-4 m-4 rounded-lg border-l-4 ${
          theme === 'dark' 
            ? 'bg-red-900 border-red-600 text-red-200' 
            : 'bg-red-50 border-red-400 text-red-800'
        }`}>
          <div className="flex items-start gap-3">
            <HiExclamationTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">接続エラー</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* チャットメッセージエリア */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 cursor-text"
        onClick={handleChatAreaClick}
      >
        {messages.length === 0 ? (
          <div className="text-center mt-20 max-w-4xl mx-auto">
            <HiChatBubbleLeftRight className="w-16 h-16 mx-auto mb-4 text-blue-900 opacity-50" />
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              AIとの会話を始めましょう
            </p>
            <p className={`text-sm mt-2 mb-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              下のメッセージ欄に質問を入力してください
            </p>

            {/* 学習用説明エリア */}
            <div className={`p-6 rounded-lg border-l-4 border-blue-900 text-left ${
              theme === 'dark' ? 'bg-blue-900/20 text-gray-200' : 'bg-blue-50 text-blue-900'
            }`}>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <HiChartBarSquare className="w-5 h-5" />
                AI学習機能について
              </h3>
              <div className="space-y-2 text-sm">
                <p className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>メタデータ表示:</strong> 各メッセージのトークン数、応答時間、生成速度をリアルタイムで確認できます</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>生成速度:</strong> token/s（tokens per second）でAIの処理性能を学習できます</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>応答時間:</strong> 質問送信から完了までの時間をミリ秒単位で表示します</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>コンテキストウィンドウ:</strong> 「現在/最大」形式で表示。モデルが処理できる文脈の限界とともに現在の使用量を紫色で表示します</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>セッション統計:</strong> ヘッダーで全体の統計情報を確認できます</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>表示切替:</strong> 右上のアイコンでメタデータの表示/非表示を切り替えできます</span>
                </p>
              </div>
              <div className={`mt-4 p-3 rounded ${
                theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'
              }`}>
                <p className="text-xs opacity-75 flex items-start gap-2">
                  <HiLightBulb className="w-3 h-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                  <span>
                    <strong>学習のコツ:</strong> 
                    同じ質問を複数回試したり、質問の長さを変えて応答時間やトークン数の変化を観察してみましょう！また、会話が長くなるにつれてコンテキストトークン数が増加し、LLMの動作にどう影響するかも注目してください。
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-2xl relative">
                <div
                  className={`px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-900 text-white min-w-64'
                      : theme === 'dark'
                      ? 'bg-gray-800 border border-gray-700'
                      : 'bg-white border border-gray-200 shadow-sm'
                  }`}
                >
                  {/* メッセージ上部: メタデータ */}
                  {showStats && message.metadata && (
                    <div className={`text-xs mb-2 pb-2 border-b ${
                      message.role === 'user'
                        ? 'text-gray-200 border-gray-600'
                        : theme === 'dark' 
                        ? 'text-white border-gray-600' 
                        : 'text-gray-500 border-gray-200'
                    }`}>
                      {/* ユーザーメッセージ: トークン数と時刻を分離 */}
                      {message.role === 'user' && (
                        <div className="flex items-center justify-between">
                          <span 
                            className="cursor-pointer hover:underline"
                            onClick={() => toggleMessageTokenization(message.id)}
                            title="クリックでトークン分割表示を切り替え"
                          >
                            {message.metadata.tokenCount.toLocaleString()} tokens
                          </span>
                          <span className="opacity-60">
                            {new Date(message.metadata.timestamp).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      
                      {/* AIメッセージ: モデル名、トークン数、時刻 */}
                      {message.role === 'assistant' && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="font-medium">{message.model || 'Unknown Model'}</span>
                            <span 
                              className="cursor-pointer hover:underline"
                              onClick={() => toggleMessageTokenization(message.id)}
                              title="クリックでトークン分割表示を切り替え"
                            >
                              {message.metadata.tokenCount.toLocaleString()} tokens
                            </span>
                            {message.thinking && message.thinking.trim().length > 0 && (
                              <span 
                                className={`cursor-pointer hover:underline flex items-center gap-1 ${
                                  theme === 'dark' ? 'text-yellow-300' : 'text-purple-600'
                                }`}
                                onClick={() => toggleMessageThinking(message.id)}
                                title="クリックでThinking内容を表示/非表示"
                              >
                                <HiCpuChip className="w-4 h-4" />
                                thinking
                              </span>
                            )}
                            {message.reasoning && message.reasoning.trim().length > 0 && (
                              <span 
                                className={`cursor-pointer hover:underline flex items-center gap-1 ${
                                  theme === 'dark' ? 'text-cyan-300' : 'text-cyan-600'
                                }`}
                                onClick={() => toggleMessageThinking(message.id)}
                                title="クリックでReasoning内容を表示/非表示"
                              >
                                <HiLightBulb className="w-4 h-4" />
                                reasoning
                              </span>
                            )}
                          </div>
                          <span className="opacity-60">
                            {new Date(message.metadata.timestamp).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Thinking内容（展開時のみ表示） */}
                  {message.role === 'assistant' && 
                   message.thinking && 
                   message.thinking.trim().length > 0 && 
                   showThinkingMessages.has(message.id) && (
                    <div className={`mt-3 p-3 rounded-md border-l-4 ${
                      theme === 'dark' 
                        ? 'bg-yellow-900/20 border-yellow-400 text-yellow-300' 
                        : 'bg-purple-50 border-purple-400 text-purple-800'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <HiCpuChip className="w-4 h-4" />
                        <span className="text-sm font-medium">Thinking Process</span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {tokenizedMessages.has(message.id) ? (
                          <TokenizedText text={preprocessAIContent(message.thinking)} isDark={theme === 'dark'} />
                        ) : (
                          preprocessAIContent(message.thinking)
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reasoning内容（展開時のみ表示） */}
                  {message.role === 'assistant' && 
                   message.reasoning && 
                   message.reasoning.trim().length > 0 && 
                   showThinkingMessages.has(message.id) && (
                    <div className={`mt-3 p-3 rounded-md border-l-4 ${
                      theme === 'dark' 
                        ? 'bg-cyan-900/20 border-cyan-400 text-cyan-300' 
                        : 'bg-cyan-50 border-cyan-400 text-cyan-800'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <HiLightBulb className="w-4 h-4" />
                        <span className="text-sm font-medium">Reasoning Process</span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {tokenizedMessages.has(message.id) ? (
                          <TokenizedText text={preprocessAIContent(message.reasoning)} isDark={theme === 'dark'} />
                        ) : (
                          preprocessAIContent(message.reasoning)
                        )}
                      </div>
                    </div>
                  )}

                  {/* メッセージ内容 */}
                  {message.role === 'user' ? (
                    <div className="whitespace-pre-wrap">
                      {tokenizedMessages.has(message.id) ? (
                        <TokenizedText text={message.content} isDark={false} />
                      ) : (
                        message.content
                      )}
                    </div>
                  ) : (
                    <div className={`prose prose-sm max-w-none ${
                      theme === 'dark' ? 'text-gray-50' : 'text-gray-800'
                    }`}>
                      {tokenizedMessages.has(message.id) ? (
                        <div className="whitespace-pre-wrap">
                          <TokenizedText text={preprocessAIContent(message.content)} isDark={theme === 'dark'} />
                        </div>
                      ) : (
                        <Markdown
                          options={{
                            overrides: {
                              p: {
                                component: 'p',
                                props: { className: 'mb-3 leading-7' }
                              },
                              strong: {
                                component: ({children}: any) => (
                                  <strong className={`font-semibold ${
                                    theme === 'dark' ? 'text-yellow-400' : 'text-blue-700'
                                  }`}>
                                    {children}
                                  </strong>
                                )
                              },
                              ul: {
                                component: 'ul',
                                props: { className: 'mb-4 space-y-1 list-disc list-inside' }
                              },
                              ol: {
                                component: 'ol',
                                props: { className: 'mb-4 space-y-1 list-decimal list-inside' }
                              },
                              li: {
                                component: 'li',
                                props: { className: 'leading-7 ml-0' }
                              },
                              h1: {
                                component: ({children}: any) => (
                                  <h1 className={`text-xl font-bold mb-4 ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                  }`}>
                                    {children}
                                  </h1>
                                )
                              },
                              h2: {
                                component: ({children}: any) => (
                                  <h2 className={`text-lg font-semibold mb-3 ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                  }`}>
                                    {children}
                                  </h2>
                                )
                              },
                              h3: {
                                component: ({children}: any) => (
                                  <h3 className={`text-base font-medium mb-2 ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                  }`}>
                                    {children}
                                  </h3>
                                )
                              },
                              h4: {
                                component: ({children}: any) => (
                                  <h4 className={`text-sm font-medium mb-2 ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                  }`}>
                                    {children}
                                  </h4>
                                )
                              },
                              h5: {
                                component: ({children}: any) => (
                                  <h5 className={`text-sm font-normal mb-1 ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                  }`}>
                                    {children}
                                  </h5>
                                )
                              },
                              h6: {
                                component: ({children}: any) => (
                                  <h6 className={`text-xs font-normal mb-1 ${
                                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                  }`}>
                                    {children}
                                  </h6>
                                )
                              },
                              code: {
                                component: 'code',
                                props: { className: 'bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono' }
                              },
                              pre: {
                                component: 'pre',
                                props: { className: 'bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto mb-4' }
                              },
                              blockquote: {
                                component: 'blockquote',
                                props: { className: 'border-l-4 border-blue-500 pl-4 italic my-3 text-gray-700 dark:text-gray-300' }
                              },
                              a: {
                                component: ({children, ...props}: any) => (
                                  <a 
                                    {...props}
                                    className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 underline"
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                  >
                                    {children}
                                  </a>
                                )
                              },
                              table: {
                                component: ({children}: any) => (
                                  <div className="overflow-x-auto my-4">
                                    <table className={`min-w-full border-collapse border ${
                                      theme === 'dark' 
                                        ? 'border-gray-600 bg-gray-800/50' 
                                        : 'border-gray-300 bg-white'
                                    }`}>
                                      {children}
                                    </table>
                                  </div>
                                )
                              },
                              thead: {
                                component: ({children}: any) => (
                                  <thead className={`${
                                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                                  }`}>
                                    {children}
                                  </thead>
                                )
                              },
                              tbody: {
                                component: 'tbody'
                              },
                              tr: {
                                component: ({children}: any) => (
                                  <tr className={`border-b ${
                                    theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                                  }`}>
                                    {children}
                                  </tr>
                                )
                              },
                              th: {
                                component: ({children}: any) => (
                                  <th className={`border px-4 py-2 text-left font-semibold ${
                                    theme === 'dark' 
                                      ? 'border-gray-600 text-gray-100' 
                                      : 'border-gray-300 text-gray-900'
                                  }`}>
                                    {children}
                                  </th>
                                )
                              },
                              td: {
                                component: ({children}: any) => (
                                  <td className={`border px-4 py-2 whitespace-pre-line ${
                                    theme === 'dark' 
                                      ? 'border-gray-600 text-gray-200' 
                                      : 'border-gray-300 text-gray-700'
                                  }`}>
                                    {children}
                                  </td>
                                )
                              },
                              br: {
                                component: () => <br />
                              },
                            },
                            forceBlock: true,
                          }}
                        >
                          {preprocessAIContent(message.content)}
                        </Markdown>
                      )}
                    </div>
                  )}

                  {/* AIメッセージの下部: 生成時間と速度 */}
                  {message.role === 'assistant' && showStats && message.metadata && (
                    <div className={`text-xs mt-3 pt-2 border-t flex items-center gap-6 ${
                      theme === 'dark' ? 'text-white border-gray-600' : 'text-gray-500 border-gray-200'
                    }`}>
                      {message.metadata.responseTime !== undefined && (
                        <span>{Math.round(message.metadata.responseTime).toLocaleString()}ms</span>
                      )}
                      {message.metadata.tokensPerSecond !== undefined && message.metadata.tokensPerSecond > 0 && (
                        <span>{(Math.round(message.metadata.tokensPerSecond * 10) / 10).toLocaleString()} token/s</span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* AIメッセージ生成中の小さなスピナー（最後のメッセージのみ） */}
                {loading && 
                 message.role === 'assistant' && 
                 message.content && 
                 message.content.trim().length > 0 && 
                 index === messages.length - 1 && (
                  <div className="absolute -right-4 -bottom-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-900 border-t-transparent"></div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {loading && (() => {
          // 最後のメッセージがAIで内容がない場合のみ「生成中...」メッセージを表示
          const lastMessage = messages[messages.length - 1];
          const shouldShowGeneratingMessage = !lastMessage || 
            lastMessage.role !== 'assistant' || 
            !lastMessage.content || 
            lastMessage.content.trim().length === 0;

          return shouldShowGeneratingMessage ? (
            <div className="flex justify-start">
              <div className={`max-w-2xl px-4 py-3 rounded-lg ${
                theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-900"></div>
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                    AI が回答を生成中...
                  </span>
                </div>
              </div>
            </div>
          ) : null;
        })()}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className={`p-4 pl-20 border-t ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <form onSubmit={sendMessage} className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="メッセージを入力してください（Enter: 改行 / Shift+Enter: 送信）..."
            rows={Math.min(input.split('\n').length, 5)}
            className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 resize-none ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                if (!loading && input.trim()) {
                  sendMessage(e as any);
                }
              }
              // Enter単体は改行（デフォルト動作を許可）
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-blue-900 text-white rounded-full hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <HiPaperAirplane className="w-4 h-4" />
            送信
          </button>
        </form>
      </div>

      {/* 設定ボタン（左下固定） */}
      <button
        onClick={() => window.location.href = '/settings'}
        className={`fixed bottom-4 left-4 p-3 rounded-full shadow-lg transition-all hover:scale-110 z-10 ${
          theme === 'dark' 
            ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700' 
            : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
        }`}
        title="設定"
      >
        <HiCog6Tooth className="w-6 h-6" />
      </button>
    </div>
  );
}
