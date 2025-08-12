'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from './contexts/ThemeContext';
import { HiPaperAirplane, HiSun, HiMoon, HiChatBubbleLeftRight, HiExclamationTriangle, HiArrowPath, HiChartBarSquare, HiEye, HiEyeSlash, HiClock, HiBolt, HiCog6Tooth } from 'react-icons/hi2';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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
  const [lmStudioUrl, setLmStudioUrl] = useState('http://localhost:1234/v1');
  const [showStats, setShowStats] = useState(true);
  const [tokenizedMessages, setTokenizedMessages] = useState<Set<string>>(new Set());
  
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

    return {
      totalMessages: messages.length,
      assistantMessages: assistantMessages.length,
      totalTokens,
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          model: selectedModel,
          lmStudioUrl,
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
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
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
              if (parsed.content) {
                assistantContent += parsed.content;
                tokenCount = estimateTokens(assistantContent);
                
                const currentTime = Date.now();
                const responseTime = currentTime - startTime;
                const tokensPerSecond = tokenCount / (responseTime / 1000);

                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessage.id
                    ? { 
                        ...msg, 
                        content: assistantContent,
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
            <HiChatBubbleLeftRight className="w-8 h-8 text-blue-900" />
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
                // メタデータを非表示にする場合、全てのトークン分けをリセット
                if (showStats) {
                  setTokenizedMessages(new Set());
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
              ? 'bg-gray-800 border-gray-700 text-gray-400' 
              : 'bg-gray-50 border-gray-200 text-gray-600'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span>{getSessionStats().totalMessages.toLocaleString()}メッセージ</span>
                <span>{getSessionStats().totalTokens.toLocaleString()}トークン</span>
              </div>
              <div className="flex items-center gap-3">
                <span>{getSessionStats().avgTokensPerSecond.toLocaleString()} t/s</span>
                <span>{getSessionStats().avgResponseTime.toLocaleString()}ms</span>
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
              theme === 'dark' ? 'bg-blue-900/20 text-blue-200' : 'bg-blue-50 text-blue-900'
            }`}>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <HiChartBarSquare className="w-5 h-5" />
                AI学習機能について
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>📊 メタデータ表示:</strong> 各メッセージのトークン数、応答時間、生成速度をリアルタイムで確認できます</p>
                <p><strong>⚡ 生成速度:</strong> token/s（tokens per second）でAIの処理性能を学習できます</p>
                <p><strong>🕒 応答時間:</strong> 質問送信から完了までの時間をミリ秒単位で表示します</p>
                <p><strong>📈 セッション統計:</strong> ヘッダーで全体の統計情報を確認できます</p>
                <p><strong>👁️ 表示切替:</strong> 右上のアイコンでメタデータの表示/非表示を切り替えできます</p>
              </div>
              <div className={`mt-4 p-3 rounded ${
                theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'
              }`}>
                <p className="text-xs opacity-75">
                  <strong>💡 学習のコツ:</strong> 
                  同じ質問を複数回試したり、質問の長さを変えて応答時間やトークン数の変化を観察してみましょう！
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
                        ? 'text-blue-100 border-blue-700'
                        : theme === 'dark' 
                        ? 'text-gray-400 border-gray-600' 
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
                            <span className="font-medium">{selectedModel || 'Unknown Model'}</span>
                            <span 
                              className="cursor-pointer hover:underline"
                              onClick={() => toggleMessageTokenization(message.id)}
                              title="クリックでトークン分割表示を切り替え"
                            >
                              {message.metadata.tokenCount.toLocaleString()} tokens
                            </span>
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
                    <div className={`prose prose-sm max-w-none ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                      {tokenizedMessages.has(message.id) ? (
                        <div className="whitespace-pre-wrap">
                          <TokenizedText text={message.content} isDark={theme === 'dark'} />
                        </div>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                        >
                          {message.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  )}

                  {/* AIメッセージの下部: 生成時間と速度 */}
                  {message.role === 'assistant' && showStats && message.metadata && (
                    <div className={`text-xs mt-3 pt-2 border-t flex items-center gap-6 ${
                      theme === 'dark' ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-200'
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
