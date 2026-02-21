"""
Deepgram Voice Agent Main Entry Point

This module initializes the Deepgram Voice Agent V1 SDK with environment
configuration and establishes WebSocket connections for real-time voice processing.
"""

import os
from dotenv import load_dotenv
from deepgram import DeepgramClient
from deepgram.core.events import EventType
from deepgram.extensions.types.sockets import AgentV1ControlMessage

from agent import get_agent_settings


def initialize_deepgram_client():
    """
    Initialize and return a DeepgramClient instance with API key from environment.

    Returns:
        DeepgramClient: Configured Deepgram client instance

    Raises:
        ValueError: If DEEPGRAM_API_KEY is not set in environment variables

    Example:
        >>> client = initialize_deepgram_client()
        >>> with client.agent.v1.connect() as connection:
        ...     # Handle connection
    """
    # Load environment variables from .env file
    load_dotenv()

    # Get API key from environment
    deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")

    # Validate API key is present
    if not deepgram_api_key:
        raise ValueError(
            "DEEPGRAM_API_KEY environment variable is not set. "
            "Please set it in your .env file or environment."
        )

    # Create and return DeepgramClient instance
    return DeepgramClient(deepgram_api_key)


def on_open(connection, **kwargs):
    """
    Handle the WebSocket OPEN event.

    This event fires when the connection is established. Send agent settings
    immediately after connection opens to configure the voice agent.

    Args:
        connection: The Deepgram agent connection object
        **kwargs: Additional event arguments
    """
    settings = get_agent_settings()
    connection.send_settings(settings)


def on_message(connection, **kwargs):
    """
    Handle the WebSocket MESSAGE event.

    This event receives both JSON control messages and binary audio data.
    Check message type to determine handling approach.

    Args:
        connection: The Deepgram agent connection object
        **kwargs: Additional event arguments including 'message' which may be
                  a dict (JSON) or bytes (binary audio)
    """
    message = kwargs.get("message")

    if isinstance(message, dict):
        # Handle JSON control messages
        # TODO: Implement JSON message handling in future subtasks
        pass
    elif isinstance(message, bytes):
        # Handle binary audio data
        # TODO: Implement audio handling in future subtasks
        pass


def on_close(connection, **kwargs):
    """
    Handle the WebSocket CLOSE event.

    This event fires when the connection is closed. Log the closure
    and perform any necessary cleanup.

    Args:
        connection: The Deepgram agent connection object
        **kwargs: Additional event arguments including 'code' (close code)
                  and 'reason' (close reason)
    """
    close_code = kwargs.get("code")
    close_reason = kwargs.get("reason")

    if close_code:
        print(f"Connection closed: code={close_code}, reason={close_reason}")
    else:
        print("Connection closed")


def on_error(connection, **kwargs):
    """
    Handle the WebSocket ERROR event.

    This event fires when an error occurs on the connection.

    Args:
        connection: The Deepgram agent connection object
        **kwargs: Additional event arguments including 'error' with error details
    """
    error = kwargs.get("error")
    if error:
        print(f"Connection error: {error}")
    else:
        print("Connection error occurred")


def main():
    """
    Main entry point for the Deepgram Voice Agent application.

    Establishes WebSocket connection using context manager pattern,
    registers event handlers, and starts listening for voice events.
    """
    try:
        # Initialize the Deepgram client with environment configuration
        client = initialize_deepgram_client()

        # Use context manager for automatic connection cleanup
        with client.agent.v1.connect() as connection:
            # Register event handlers BEFORE calling start_listening()
            connection.on(EventType.OPEN, on_open)
            connection.on(EventType.MESSAGE, on_message)
            connection.on(EventType.CLOSE, on_close)
            connection.on(EventType.ERROR, on_error)

            # Start the event loop
            connection.start_listening()

    except ValueError as e:
        print(f"Configuration error: {e}")
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
