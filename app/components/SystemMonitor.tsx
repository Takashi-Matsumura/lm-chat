'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { HiCpuChip, HiCircleStack, HiComputerDesktop } from 'react-icons/hi2';

interface SystemInfo {
  cpu: {
    usage: number;
    cores: {
      total: number;
      performance: number;
      efficiency: number;
    };
    model: string;
    detailedUsage?: {
      performanceCores: number[];
      efficiencyCores: number[];
    };
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
    unified: boolean;
    details?: {
      wired: number;
      active: number;
      inactive: number;
      compressed: number;
    };
  };
  gpu?: {
    usage: number;
    memoryUsed: number;
    memoryTotal: number;
  };
  timestamp: number;
}

export default function SystemMonitor() {
  const { theme } = useTheme();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showDetailed, setShowDetailed] = useState(false);

  // バイト数を人間が読みやすい形式に変換
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 使用率に応じた色を返す関数
  const getUsageColor = (usage: number) => {
    if (usage < 50) return 'text-green-500';
    if (usage < 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  // 使用率に応じた背景色を返す関数
  const getUsageBackgroundColor = (usage: number) => {
    if (usage < 50) return 'bg-green-500';
    if (usage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // システム情報を取得する関数
  const fetchSystemInfo = async () => {
    try {
      const response = await fetch('/api/system-info');
      if (!response.ok) {
        throw new Error('システム情報の取得に失敗しました');
      }
      const data = await response.json();
      setSystemInfo(data);
      setError('');
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setIsLoading(false);
    }
  };

  // 初期化とリアルタイム更新
  useEffect(() => {
    fetchSystemInfo();
    
    // 2秒ごとに更新
    const interval = setInterval(fetchSystemInfo, 2000);
    
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${
          theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
        }`}>
          <HiCpuChip className="w-4 h-4 animate-pulse" />
          <span className="text-sm">読込中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 rounded-lg border border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20">
        <span className="text-sm text-red-600 dark:text-red-400">システム情報取得エラー</span>
      </div>
    );
  }

  if (!systemInfo) return null;

  return (
    <div className="flex items-center gap-2">
      {/* デスクトップ・タブレット表示: コンパクト表示 */}
      {!showDetailed && (
        <>
          {/* CPU使用率 */}
          <div className={`hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg border ${
            theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
          }`}>
            <HiCpuChip className={`w-4 h-4 ${getUsageColor(systemInfo.cpu.usage)}`} />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">CPU</span>
              <div className="flex items-center gap-1">
                <div className={`w-12 h-2 rounded-full ${
                  theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                }`}>
                  <div 
                    className={`h-full rounded-full ${getUsageBackgroundColor(systemInfo.cpu.usage)} transition-all duration-300`}
                    style={{ width: `${systemInfo.cpu.usage}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${getUsageColor(systemInfo.cpu.usage)}`}>
                  {systemInfo.cpu.usage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* メモリ使用率 */}
          <div className={`hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg border ${
            theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
          }`}>
            <HiCircleStack className={`w-4 h-4 ${getUsageColor(systemInfo.memory.usage)}`} />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">RAM</span>
              <div className="flex items-center gap-1">
                <div className={`w-12 h-2 rounded-full ${
                  theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                }`}>
                  <div 
                    className={`h-full rounded-full ${getUsageBackgroundColor(systemInfo.memory.usage)} transition-all duration-300`}
                    style={{ width: `${systemInfo.memory.usage}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${getUsageColor(systemInfo.memory.usage)}`}>
                  {systemInfo.memory.usage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* GPU使用率（存在する場合） */}
          {systemInfo.gpu && (
            <div className={`hidden xl:flex items-center gap-2 px-3 py-1 rounded-lg border ${
              theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
            }`}>
              <HiComputerDesktop className={`w-4 h-4 ${getUsageColor(systemInfo.gpu.usage)}`} />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">GPU</span>
                <div className="flex items-center gap-1">
                  <div className={`w-12 h-2 rounded-full ${
                    theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                  }`}>
                    <div 
                      className={`h-full rounded-full ${getUsageBackgroundColor(systemInfo.gpu.usage)} transition-all duration-300`}
                      style={{ width: `${systemInfo.gpu.usage}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${getUsageColor(systemInfo.gpu.usage)}`}>
                    {systemInfo.gpu.usage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 詳細表示ダイアログ */}
      {showDetailed && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailed(false)}>
          <div 
            className={`p-4 sm:p-6 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto ${
              theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold">システム詳細情報</h3>
              <button
                onClick={() => setShowDetailed(false)}
                className={`p-1 rounded-md transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-gray-600 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                }`}
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* M4チップ情報 */}
              <div className="flex items-center gap-2 mb-3">
                <HiCpuChip className="w-5 h-5 text-blue-500" />
                <span className="font-medium">{systemInfo.cpu.model}</span>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  ({systemInfo.cpu.cores.performance}P + {systemInfo.cpu.cores.efficiency}E cores)
                </span>
              </div>

              {/* CPU詳細 */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <div className="text-sm font-medium mb-1">Performance Cores ({systemInfo.cpu.cores.performance})</div>
                  <div className="flex items-center gap-2">
                    <div className={`flex-1 h-2 rounded-full ${
                      theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                    }`}>
                      <div 
                        className={`h-full rounded-full ${getUsageBackgroundColor(systemInfo.cpu.usage)} transition-all duration-300`}
                        style={{ width: `${systemInfo.cpu.usage}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${getUsageColor(systemInfo.cpu.usage)}`}>
                      {systemInfo.cpu.usage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-1">Efficiency Cores ({systemInfo.cpu.cores.efficiency})</div>
                  <div className="flex items-center gap-2">
                    <div className={`flex-1 h-2 rounded-full ${
                      theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                    }`}>
                      <div 
                        className={`h-full rounded-full ${getUsageBackgroundColor(systemInfo.cpu.usage * 0.6)} transition-all duration-300`}
                        style={{ width: `${systemInfo.cpu.usage * 0.6}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${getUsageColor(systemInfo.cpu.usage * 0.6)}`}>
                      {(systemInfo.cpu.usage * 0.6).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Unified Memory詳細 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <HiCircleStack className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">Unified Memory</span>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {formatBytes(systemInfo.memory.total)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>使用中: {formatBytes(systemInfo.memory.used)}</span>
                    <span className={getUsageColor(systemInfo.memory.usage)}>{systemInfo.memory.usage.toFixed(1)}%</span>
                  </div>
                  <div className={`w-full h-3 rounded-full ${
                    theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                  }`}>
                    <div 
                      className={`h-full rounded-full ${getUsageBackgroundColor(systemInfo.memory.usage)} transition-all duration-300`}
                      style={{ width: `${systemInfo.memory.usage}%` }}
                    />
                  </div>
                  
                  {/* メモリ詳細情報 */}
                  {systemInfo.memory.details && (
                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      <div className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <div className="font-medium">Wired</div>
                        <div className="truncate">{formatBytes(systemInfo.memory.details.wired)}</div>
                      </div>
                      <div className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <div className="font-medium">Active</div>
                        <div className="truncate">{formatBytes(systemInfo.memory.details.active)}</div>
                      </div>
                      <div className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <div className="font-medium">Inactive</div>
                        <div className="truncate">{formatBytes(systemInfo.memory.details.inactive)}</div>
                      </div>
                      <div className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <div className="font-medium">Compressed</div>
                        <div className="truncate">{formatBytes(systemInfo.memory.details.compressed)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* GPU情報 */}
              {systemInfo.gpu && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <HiComputerDesktop className="w-4 h-4 text-green-500" />
                    <span className="font-medium">GPU (Apple Silicon)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex-1 h-2 rounded-full ${
                      theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                    }`}>
                      <div 
                        className={`h-full rounded-full ${getUsageBackgroundColor(systemInfo.gpu.usage)} transition-all duration-300`}
                        style={{ width: `${systemInfo.gpu.usage}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${getUsageColor(systemInfo.gpu.usage)}`}>
                      {systemInfo.gpu.usage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 詳細表示切り替えボタン */}
      <button
        onClick={() => setShowDetailed(!showDetailed)}
        className={`p-2 rounded-md transition-colors ${
          theme === 'dark' 
            ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
            : 'hover:bg-gray-200 text-gray-600 hover:text-gray-800'
        }`}
        title="システム詳細情報を表示"
      >
        <HiCpuChip className="w-5 h-5" />
      </button>
    </div>
  );
}