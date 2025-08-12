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
- `app/page.tsx` - Main chat interface
- `app/layout.tsx` - Root layout with ThemeProvider
- `app/api/chat/route.ts` - Chat API endpoint for LM Studio
- `app/api/models/route.ts` - Model listing endpoint
- `app/contexts/ThemeContext.tsx` - Theme management
- `my-ai-chat/` - Reference source code (Ollama-based)

## LM Studio Integration
- Default URL: `http://localhost:1234/v1`
- Environment variable: `LM_STUDIO_URL`
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

## Development Notes
- LM Studio must be running on localhost:1234 (default)
- Uses React-icons instead of emojis
- Supports both light and dark themes
- Designed for AI beginners