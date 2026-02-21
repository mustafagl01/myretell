# Specification: Fix Git Merge & Configure Deepgram SDK

## Overview

This specification covers a two-phase critical task: (1) resolving a Git merge conflict where the current branch has no common history with `main`, requiring a force merge using `git merge --allow-unrelated-histories` via terminal; and (2) implementing Epic 2: Connection & Configuration for a Deepgram Voice Agent V1 SDK integration in a greenfield voice AI assistant project. The project will use Python with the Deepgram SDK to establish real-time voice WebSocket connections.

## Workflow Type

**Type**: feature

**Rationale**: This involves creating new functionality (Deepgram SDK integration) combined with a prerequisite infrastructure fix (Git merge). The task requires implementing new features rather than refactoring existing code or investigating issues.

## Task Scope

### Services Involved
- **Voice Agent Backend** (primary/new) - Python service using Deepgram SDK for real-time voice processing
- **Frontend Client** (future integration) - Will connect to backend for audio streaming (out of scope for this task)

### This Task Will:
- [ ] Execute `git merge --allow-unrelated-histories` to force merge current branch into main via terminal
- [ ] Resolve any merge conflicts that arise during the merge process
- [ ] Install Deepgram Voice Agent V1 SDK (`deepgram-sdk` Python package)
- [ ] Create initial project structure (`/backend` directory with Python files)
- [ ] Configure SDK settings with environment variables
- [ ] Implement `keepAlive()` function to send KeepAlive control messages every 8 seconds
- [ ] Establish WebSocket connection pattern using context manager

### Out of Scope:
- Frontend implementation (Epic 3)
- Audio streaming and playback (Epic 3)
- Interruption/barge-in logic (Epic 4)
- SaaS features (auth, credits, Stripe) (Epic 5)
- Deployment to Vercel/Render (Epic 6)

## Service Context

### Voice Agent Backend (New Service)

**Tech Stack:**
- Language: Python 3.10+
- Framework: Deepgram Voice Agent V1 SDK (`deepgram-sdk` v5.x)
- Key directories: `/backend` (to be created)

**Entry Point:** `backend/main.py` (to be created)

**How to Run:**
```bash
# Install dependencies
pip install deepgram-sdk python-dotenv

# Run the application
python backend/main.py
```

**Port:** TBD (not yet defined, will be determined during implementation)

## Files to Create

| File | Service | Purpose |
|------|---------|---------|
| `backend/main.py` | Voice Agent Backend | Main entry point with Deepgram connection setup |
| `backend/requirements.txt` | Voice Agent Backend | Python dependencies (deepgram-sdk, python-dotenv) |
| `backend/.env.example` | Voice Agent Backend | Environment variable template |
| `backend/agent.py` | Voice Agent Backend | Agent configuration and keepAlive implementation |

## Files to Reference

Note: This is a greenfield project with no existing files to reference. The following patterns are derived from research and Deepgram SDK documentation:

| Pattern | Source | What to Follow |
|---------|--------|----------------|
| Context manager pattern | Deepgram SDK docs | Use `with client.agent.v1.connect() as connection:` for automatic cleanup |
| KeepAlive timing | Research findings (v5.x breaking change) | Send KeepAlive control message every 8 seconds, not 5 |
| Event handler registration | Deepgram SDK docs | Register all handlers BEFORE calling `start_listening()` |

## Patterns to Follow

### Deepgram Agent Connection Pattern

From Deepgram SDK documentation:

```python
from deepgram import DeepgramClient
from deepgram.extensions.types.sockets import (
    AgentV1SettingsMessage, AgentV1ControlMessage, AgentV1MediaMessage
)

# Required: context manager pattern for automatic cleanup
with client.agent.v1.connect() as connection:
    connection.send_settings(settings)
    connection.start_listening()
```

**Key Points:**
- Context manager ensures proper connection cleanup on exit
- Must send settings immediately after connection opens
- `start_listening()` begins the event loop

### KeepAlive Pattern (Critical - v5.x Breaking Change)

```python
import time

def keep_alive_loop(connection):
    """Send KeepAlive every 8 seconds during silence."""
    while connection.is_connected:
        connection.send_control(AgentV1ControlMessage(type='KeepAlive'))
        time.sleep(8)
```

**Key Points:**
- KeepAlive is NOT automatic in v5.x (major breaking change)
- Must be manually triggered every 8 seconds during silence periods
- Server sends NO response to KeepAlive messages
- Required to prevent WebSocket timeout during audio gaps

### Event Handler Registration Pattern

```python
def on_open(connection, **kwargs):
    """Send settings when connection opens."""
    settings = AgentV1SettingsMessage(
        listen=AgentV1ListenSettings(model="nova-3"),
        think=AgentV1ThinkSettings(provider="openai", model="gpt-4o-mini"),
        speak=AgentV1SpeakSettings(voice="aura-2-thalia-en")
    )
    connection.send_settings(settings)

def on_message(connection, **kwargs):
    """Handle both JSON messages AND binary audio separately."""
    # Check for message type
    message = kwargs.get("message")
    if isinstance(message, dict):
        # JSON event handling
        pass
    else:
        # Binary audio handling
        pass

# Register BEFORE start_listening()
connection.on(LiveEvents.OPEN, on_open)
connection.on(LiveEvents.MESSAGE, on_message)
connection.start_listening()
```

**Key Points:**
- Event handlers MUST be registered before `start_listening()`
- `MESSAGE` event can receive both JSON and binary data
- `OPEN` event is where settings should be sent

## Requirements

### Functional Requirements

1. **Git Merge Resolution**
   - Description: Force merge current branch into main using terminal Git commands
   - Acceptance: Merge completes successfully, `git log` shows merged commits

2. **Deepgram SDK Installation**
   - Description: Install `deepgram-sdk` v5.x and `python-dotenv` packages
   - Acceptance: `pip show deepgram-sdk` shows installed package

3. **Project Structure**
   - Description: Create `/backend` directory with initial Python files
   - Acceptance: Directory exists with `main.py`, `requirements.txt`, `.env.example`, `agent.py`

4. **Environment Configuration**
   - Description: Configure DEEPGRAM_API_KEY and optionally OPENAI_API_KEY
   - Acceptance: `.env` file exists with required variables, `.env.example` documents them

5. **WebSocket Connection**
   - Description: Establish connection using context manager pattern
   - Acceptance: Connection opens successfully, OPEN event fires

6. **Agent Settings Configuration**
   - Description: Configure Listen (nova-3), Think (gpt-4o-mini), Speak (aura-2-thalia-en)
   - Acceptance: Settings sent successfully after connection opens

7. **KeepAlive Function**
   - Description: Implement keepAlive() sending control message every 8 seconds
   - Acceptance: Function sends `AgentV1ControlMessage(type='KeepAlive')` every 8s during silence

### Edge Cases

1. **Git Merge Conflicts** - Resolve any conflicts manually, preserving both histories where possible
2. **Missing API Keys** - Raise clear error message if DEEPGRAM_API_KEY not set
3. **Connection Failure** - Implement retry logic or graceful error handling
4. **KeepAlive During Audio** - Only send KeepAlive during silence periods, not during active transmission
5. **WebSocket Disconnect** - Handle CLOSE and ERROR events with cleanup

## Implementation Notes

### DO
- Use terminal for Git merge: `git merge --allow-unrelated-histories <branch-name>`
- Create `/backend` directory structure following Python best practices
- Use context manager pattern: `with client.agent.v1.connect() as connection:`
- Send KeepAlive every 8 seconds (NOT 5 - plan.md has outdated info)
- Register event handlers BEFORE calling `start_listening()`
- Use python-dotenv for environment variable management
- Include `.env.example` in version control (not `.env`)

### DON'T
- Do NOT use GitHub PR web interface for the merge (will fail with unrelated histories)
- Do NOT send KeepAlive every 5 seconds (research confirms 8 seconds is correct)
- Do NOT call `start_listening()` before registering event handlers
- Do NOT commit `.env` file with actual API keys
- Do NOT implement frontend features (Epic 3) in this task

### Git Merge Specific Steps

```bash
# 1. Check current branch
git branch

# 2. Switch to main branch
git checkout main

# 3. Pull latest main (if remote exists)
git pull origin main

# 4. Merge with unrelated histories
git merge --allow-unrelated-histories <your-branch-name>

# 5. Resolve conflicts if any occur
# Edit conflicting files, then:
git add <resolved-files>
git commit -m "Merge branch with unrelated histories"

# 6. Push merged result
git push origin main
```

### Deepgram SDK Installation

```bash
# Create backend directory
mkdir backend
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install deepgram-sdk python-dotenv

# Save to requirements.txt
pip freeze > requirements.txt
```

## Development Environment

### Start Services

```bash
# Navigate to backend
cd backend

# Activate virtual environment (if using)
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python main.py
```

### Service URLs
- Voice Agent Backend: http://localhost:8000 (TBD - will be defined during implementation)

### Required Environment Variables
Create `.env` file in `/backend` directory:

```env
DEEPGRAM_API_KEY=your_deepgram_api_key_here
OPENAI_API_KEY=your_openai_api_key_here  # Required if using OpenAI Think provider
```

## Success Criteria

The task is complete when:

1. [ ] Git merge completes successfully with no errors
2. [ ] `git log` shows merged commit history from both branches
3. [ ] `/backend` directory exists with Python project structure
4. [ ] `requirements.txt` includes `deepgram-sdk` and `python-dotenv`
5. [ ] `.env.example` documents required environment variables
6. [ ] Deepgram client initializes without errors
7. [ ] WebSocket connection establishes successfully (OPEN event fires)
8. [ ] Agent settings are configured (Listen: nova-3, Think: gpt-4o-mini, Speak: aura-2-thalia-en)
9. [ ] `keepAlive()` function sends KeepAlive control messages every 8 seconds
10. [ ] No console errors during connection and settings phase

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| KeepAlive interval | `tests/test_keepalive.py` | Verify KeepAlive sent every 8 seconds, not 5 or 10 |
| Environment loading | `tests/test_config.py` | Verify DEEPGRAM_API_KEY loaded correctly |
| Settings message | `tests/test_settings.py` | Verify AgentV1SettingsMessage has correct configuration |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Deepgram Connection | App ↔ Deepgram API | WebSocket connection opens, authenticates, sends settings |
| KeepAlive during silence | App ↔ Deepgram API | KeepAlive messages sent every 8s during audio gap |
| Settings application | App ↔ Deepgram API | Agent configured with nova-3, gpt-4o-mini, aura-2-thalia-en |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Git Merge | 1. Checkout main 2. Merge with --allow-unrelated-histories 3. Verify log | Both branch histories present in main |
| SDK Connection | 1. Run main.py 2. Load env vars 3. Connect to Deepgram 4. Verify OPEN event | Connection established, settings sent |
| KeepAlive Loop | 1. Establish connection 2. Wait 16+ seconds 3. Verify KeepAlive count | At least 2 KeepAlive messages sent |

### Browser Verification (N/A)
Not applicable - this task does not include frontend implementation.

### Database Verification (N/A)
Not applicable - this task does not include database setup.

### Git Repository Verification
| Check | Command | Expected |
|-------|---------|----------|
| Merge completed | `git log --oneline --graph` | Shows merge commit with both parents |
| No merge conflicts | `git status` | Clean working directory |
| Branch up to date | `git status` | "On branch main", nothing to commit |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Git merge verified in repository history
- [ ] Deepgram SDK installed and importable
- [ ] Environment variables documented in `.env.example`
- [ ] KeepAlive timing verified (8 seconds)
- [ ] No regressions in Git history
- [ ] Code follows Python PEP 8 style guidelines
- [ ] No API keys committed to repository
