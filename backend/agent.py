"""
Deepgram Voice Agent Configuration Module

This module provides agent settings and configuration for the Deepgram Voice Agent V1 SDK.
"""

import time
import threading
from deepgram.extensions.types.sockets import AgentV1SettingsMessage, AgentV1ControlMessage


def get_agent_settings():
    """
    Create and return Deepgram Agent V1 settings.

    Returns:
        AgentV1SettingsMessage: Configured agent settings with:
            - Listen: Uses Deepgram's nova-3 model with smart formatting
            - Think: Uses OpenAI's gpt-4o-mini model
            - Speak: Uses Deepgram's aura-2-thalia-en voice
            - Greeting: Initial welcome message

    Example:
        >>> settings = get_agent_settings()
        >>> connection.send_settings(settings)
    """
    settings = AgentV1SettingsMessage(
        listen={
            "provider": {
                "type": "deepgram",
                "model": "nova-3"
            },
            "smart_format": True
        },
        think={
            "provider": {
                "type": "open_ai",
                "model": "gpt-4o-mini"
            },
            "prompt": "You are a friendly AI assistant.",
            "temperature": 0.7
        },
        speak={
            "provider": {
                "type": "deepgram",
                "model": "aura-2-thalia-en"
            }
        },
        greeting="Hello! How can I help you today?"
    )
    return settings


def keep_alive_loop(connection, stop_event, interval=8):
    """
    Send KeepAlive control messages periodically to maintain WebSocket connection.

    This function runs in a separate thread and sends KeepAlive messages every
    8 seconds (by default) to prevent the WebSocket connection from timing out
    during periods of silence or inactivity.

    Args:
        connection: Deepgram Agent V1 connection object
        stop_event (threading.Event): Event to signal when to stop the loop
        interval (int, optional): Seconds between KeepAlive messages. Defaults to 8.

    Note:
        - KeepAlive is NOT automatic in Deepgram SDK v5.x (breaking change)
        - Server sends NO response to KeepAlive messages
        - Only send during silence periods, not during active audio transmission

    Example:
        >>> stop_event = threading.Event()
        >>> thread = threading.Thread(
        ...     target=keep_alive_loop,
        ...     args=(connection, stop_event)
        ... )
        >>> thread.start()
        >>> # ... later when connection closes ...
        >>> stop_event.set()
        >>> thread.join()
    """
    while not stop_event.is_set():
        try:
            connection.send_control(AgentV1ControlMessage(type='KeepAlive'))
            time.sleep(interval)
        except Exception as e:
            # Connection may be closed or error occurred
            # Exit loop to prevent continuous errors
            break
