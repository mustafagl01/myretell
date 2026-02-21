# Real-Time Voice AI Assistant (Deepgram Voice Agent V1) - Master Plan

## Project Overview
Build a high-performance voice assistant using Deepgram's integrated Voice Agent API.
The system uses a single WebSocket to handle the entire "Listen-Think-Speak" loop.

## Architecture & Tech Stack
1. **Engine:** Deepgram Voice Agent API V1 (Nova-3 STT, GPT-4o-mini LLM, Aura-2 TTS).
2. **Backend:** Node.js (WebSocket server as a proxy or direct client).
3. **Frontend:** React/Vanilla JS with Web Audio API for real-time playback.
4. **Tools/Actions:** Rube.app (via MCP/Function Calling) for Vercel, Render, and Stripe automations.

---

## Core Architecture Rules (PRIORITY)
1. **Tool Execution via Rube.app:** ALWAYS prioritize using **Rube.app (Composio)** via MCP for infrastructure tasks (Vercel deployment, Render management, Stripe operations). Use standalone API keys only as a fallback.
2. **Real-Time Voice Engine:** Use **Deepgram Voice Agent V1 SDK** directly for the core voice loop (STT/LLM/TTS) to ensure the lowest possible latency. Do not route real-time audio through the MCP layer.
3. **Monorepo Structure:** Keep backend (`/backend` - Node.js) and frontend (`/frontend` - React/Vanilla) in this repository.

## Epic 1: Environment & SDK Setup
* **Task 1.1:** Initialize project directory with `/frontend` and `/backend`.
* **Task 1.2:** Install Deepgram SDK and dependencies: `npm install @deepgram/sdk cross-fetch`.
* **Task 1.3:** Setup `.env` and verify all API keys.

## Epic 2: Connection & Configuration
* **Task 2.1:** Establish a WebSocket connection using `client.agent.v1.connect()`.
* **Task 2.2:** Configure Agent settings: Listen (nova-3), Think (gpt-4o-mini), Speak (aura-2-thalia-en).
* **Task 2.3:** Implement 5-second heartbeat using `connection.keepAlive()`.

## Epic 3: Audio Streaming & Playback
* **Task 3.1:** Capture mic audio in frontend and stream to backend.
* **Task 3.2:** Process incoming binary audio chunks from `AgentEvents.Audio`.
* **Task 3.3:** Implement seamless audio queue for real-time playback.

## Epic 4: Interruption (Barge-in) & Logic
* **Task 4.1:** Handle `UserStartedSpeaking` event to instantly silence the agent.
* **Task 4.2:** Integrate Rube.app via Function Calling for database or tool-related tasks.

## Epic 5: SaaS Layer (Auth & Credits)
* **Task 5.1:** Setup Vercel Postgres using Prisma.
* **Task 5.2:** Implement Google & Email Auth.
* **Task 5.3:** Usage Tracking: Charge users based on WebSocket connection time (1 hour = 1 hour credit).
* **Task 5.4:** Stripe integration for credit purchases.

## Epic 6: Automated Deployment
* **Task 6.1:** Use Rube.app (MCP) to deploy frontend to Vercel and backend to Render.

