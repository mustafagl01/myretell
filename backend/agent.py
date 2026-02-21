"""
Deepgram Voice Agent Configuration Module

This module provides agent settings and configuration for the Deepgram Voice Agent V1 SDK.
"""

from deepgram.extensions.types.sockets import AgentV1SettingsMessage


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
