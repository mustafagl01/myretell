# Real-Time Voice AI Assistant (Deepgram Voice Agent V1) - Master Plan

## Project Overview
Build a high-performance voice assistant using Deepgram's integrated Voice Agent API. 
The system uses a single WebSocket to handle the entire "Listen-Think-Speak" loop.

## Architecture & Tech Stack
1. **Engine:** Deepgram Voice Agent API V1 (Nova-3 STT, GPT-4o-mini LLM, Aura-2 TTS).
2. **Backend:** Node.js (WebSocket server as a proxy or direct client).
3. **Frontend:** React/Vanilla JS with Web Audio API for real-time playback.
4. **Tools/Actions:** Rube.app (via MCP/Function Calling) for Vercel, Render, and Stripe automations.
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

## Epic 1: Environment & SDK Setup
* **Task 1.1:** Initialize project directory with `/frontend` and `/backend`.
* **Task 1.2:** Install Deepgram SDK: `npm install @deepgram/sdk cross-fetch`.
* **Task 1.3:** Setup `.env` with `DEEPGRAM_API_KEY` and `RUBE_API_KEY`.

## Epic 2: Connection & Configuration
* **Task 2.1:** Establish a WebSocket connection using `client.agent.v1.connect()`.
* **Task 2.2:** Configure the Agent via `AgentV1SettingsMessage`:
    - **Listen:** Model "nova-3".
    - **Think:** Provider "open_ai", Model "gpt-4o-mini".
    - **Speak:** Model "aura-2-thalia-en".
* **Task 2.3:** Implement a 5-second `keepAlive()` heartbeat to maintain the connection.

## Epic 3: Audio Streaming & Playback
* **Task 3.1:** Implement frontend audio capture and send raw chunks to backend.
* **Task 3.2:** Handle incoming `AgentEvents.Audio` (binary data) from Deepgram.
* **Task 3.3:** Build an audio queue in the frontend to play incoming chunks seamlessly as a continuous stream.
* **Task 3.4:** Log conversation text using the `ConversationText` event.

## Epic 4: Advanced Interaction (Barge-in & Logic)
* **Task 4.1:** Implement Interruption: When `UserStartedSpeaking` is received, immediately clear the frontend audio buffer to silence the agent.
* **Task 4.2:** Integrate Rube.app via Function Calling: Configure the `think` provider to trigger external tools for database or deployment tasks.

## Epic 5: SaaS Layer (Auth, Database & Stripe)
* **Task 5.1:** Setup Vercel Postgres using Prisma.
* **Task 5.2:** Implement Google/Email Auth.
* **Task 5.3:** **Usage Tracking:** Implement a timer that starts on WebSocket `Open` and ends on `Close`. Charge user based on connection time (1 hour connection = 1 hour credit).
* **Task 5.4:** Stripe integration for credit top-ups.

## Epic 6: Automated Deployment
* **Task 6.1:** Use Rube.app (MCP) to automate the deployment of the frontend to Vercel and backend to Render.

---

## Epic 1: Environment & SDK Setup
* **Task 1.1:** Initialize project directory with `/frontend` and `/backend`.
* **Task 1.2:** Install Deepgram SDK: `npm install @deepgram/sdk cross-fetch`.
* **Task 1.3:** Setup `.env` with `DEEPGRAM_API_KEY` and `RUBE_API_KEY`.

## Epic 2: Connection & Configuration
* **Task 2.1:** Establish a WebSocket connection using `client.agent.v1.connect()`.
* **Task 2.2:** Configure the Agent via `AgentV1SettingsMessage`:
    - **Listen:** Model "nova-3".
    - **Think:** Provider "open_ai", Model "gpt-4o-mini".
    - **Speak:** Model "aura-2-thalia-en".
* **Task 2.3:** Implement a 5-second `keepAlive()` heartbeat to maintain the connection.

## Epic 3: Audio Streaming & Playback
* **Task 3.1:** Implement frontend audio capture and send raw chunks to backend.
* **Task 3.2:** Handle incoming `AgentEvents.Audio` (binary data) from Deepgram.
* **Task 3.3:** Build an audio queue in the frontend to play incoming chunks seamlessly as a continuous stream.
* **Task 3.4:** Log conversation text using the `ConversationText` event.

## Epic 4: Advanced Interaction (Barge-in & Logic)
* **Task 4.1:** Implement Interruption: When `UserStartedSpeaking` is received, immediately clear the frontend audio buffer to silence the agent.
* **Task 4.2:** Integrate Rube.app via Function Calling: Configure the `think` provider to trigger external tools for database or deployment tasks.

## Epic 5: SaaS Layer (Auth, Database & Stripe)
* **Task 5.1:** Setup Vercel Postgres using Prisma.
* **Task 5.2:** Implement Google/Email Auth.
* **Task 5.3:** **Usage Tracking:** Implement a timer that starts on WebSocket `Open` and ends on `Close`. Charge user based on connection time (1 hour connection = 1 hour credit).
* **Task 5.4:** Stripe integration for credit top-ups.

## Epic 6: Automated Deployment
* **Task 6.1:** Use Rube.app (MCP) to automate the deployment of the frontend to Vercel and backend to Render.