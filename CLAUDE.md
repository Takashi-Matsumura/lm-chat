# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is LM Chat, an AI Chat application built with Next.js 15, TypeScript, and Tailwind CSS v4. It connects to LM Studio server using OpenAI-compatible API for AI chat functionality.

## Development Commands
- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4
- **AI Integration**: OpenAI SDK for LM Studio connection
- **Icons**: React Icons (Heroicons v2)
- **Markdown**: React Markdown with remark-gfm
- **Theme**: Context-based light/dark mode

## Key Files
- `app/page.tsx` - Main chat interface with environment auto-detection
- `app/layout.tsx` - Root layout with ThemeProvider
- `app/api/chat/route.ts` - Chat API endpoint for LM Studio
- `app/api/models/route.ts` - Model listing endpoint
- `app/contexts/ThemeContext.tsx` - Theme management
- `app/components/EnvironmentDialog.tsx` - Environment selection dialog
- `lib/lm-studio-config.ts` - Environment configuration utilities
- `app/settings/page.tsx` - Settings with environment switcher
- `my-ai-chat/` - Reference source code (Ollama-based)

## LM Studio Integration
- **Environment Auto-Detection**: Automatically detects development vs Docker environment
- **Simple Environment Switching**: 2-choice interface (開発環境/コンテナ環境)
- **Automatic Connection Testing**: Tests both environments on startup
- **Fallback Dialog**: Shows environment selection if connection fails
- **URLs**: 
  - Development: `http://localhost:1234/v1`
  - Docker: `http://host.docker.internal:1234/v1`
- OpenAI-compatible API endpoints
- Streaming response support
- Auto model detection

## Dependencies
- React 19.1.0
- Next.js 15.4.6
- OpenAI SDK
- React Icons
- React Markdown
- Tailwind CSS v4
- http-proxy-agent (for proxy support)
- https-proxy-agent (for proxy support)

## Development Notes
- **Environment Management**: Uses `lib/lm-studio-config.ts` for centralized configuration
- **Auto-Detection Logic**: Automatically selects appropriate URL based on environment
- **Simple User Experience**: 2-choice environment switching eliminates complex URL configuration
- **Connection Resilience**: Includes timeout (30s) and retry logic (3 attempts)
- **Fallback Strategy**: Tests alternative environment if primary fails
- Uses React-icons instead of emojis
- Supports both light and dark themes
- Designed for AI beginners with educational metadata display
- Docker networking uses `host.docker.internal:1234` for container-to-host communication