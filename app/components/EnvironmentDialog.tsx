'use client';

import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { HiXMark, HiCpuChip, HiComputerDesktop } from 'react-icons/hi2';

export type Environment = 'development' | 'container';

interface EnvironmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (environment: Environment) => void;
  onTestConnection?: (environment: Environment) => Promise<boolean>;
}

export default function EnvironmentDialog({ 
  isOpen, 
  onClose, 
  onSelect,
  onTestConnection 
}: EnvironmentDialogProps) {
  const { theme } = useTheme();
  const [testing, setTesting] = useState<Environment | null>(null);

  if (!isOpen) return null;

  const handleSelect = async (environment: Environment) => {
    if (onTestConnection) {
      setTesting(environment);
      try {
        const success = await onTestConnection(environment);
        if (success) {
          onSelect(environment);
          onClose();
        } else {
          // テスト失敗時はユーザーに選択を委ねる
          if (confirm(`${environment === 'development' ? '開発' : 'コンテナ'}環境での接続に失敗しました。それでもこの設定を使用しますか？`)) {
            onSelect(environment);
            onClose();
          }
        }
      } catch (error) {
        console.error('Connection test failed:', error);
      } finally {
        setTesting(null);
      }
    } else {
      onSelect(environment);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`max-w-md w-full mx-4 rounded-lg p-6 ${
        theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">実行環境を選択</h2>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>
        
        <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          LM Studioへの接続に失敗しました。実行環境を選択してください：
        </p>

        <div className="space-y-3">
          <button
            onClick={() => handleSelect('development')}
            disabled={testing !== null}
            className={`w-full p-4 rounded-lg border-2 transition-all ${
              testing === 'development' 
                ? 'opacity-50 cursor-not-allowed' 
                : theme === 'dark'
                  ? 'border-gray-600 hover:border-blue-500 hover:bg-gray-700'
                  : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <HiComputerDesktop className="w-6 h-6 text-blue-500" />
              <div className="text-left">
                <div className="font-medium">開発環境</div>
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  localhost:1234でLM Studioに接続
                </div>
              </div>
              {testing === 'development' && (
                <div className="ml-auto">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          </button>

          <button
            onClick={() => handleSelect('container')}
            disabled={testing !== null}
            className={`w-full p-4 rounded-lg border-2 transition-all ${
              testing === 'container' 
                ? 'opacity-50 cursor-not-allowed' 
                : theme === 'dark'
                  ? 'border-gray-600 hover:border-green-500 hover:bg-gray-700'
                  : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <HiCpuChip className="w-6 h-6 text-green-500" />
              <div className="text-left">
                <div className="font-medium">コンテナ環境</div>
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  host.docker.internal:1234でLM Studioに接続
                </div>
              </div>
              {testing === 'container' && (
                <div className="ml-auto">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                </div>
              )}
            </div>
          </button>
        </div>

        <div className={`mt-4 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          この設定はアプリケーション設定で後から変更できます。
        </div>
      </div>
    </div>
  );
}