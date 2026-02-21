"""
Deepgram Voice Agent Main Entry Point

This module initializes the Deepgram Voice Agent V1 SDK with environment
configuration and establishes WebSocket connections for real-time voice processing.
"""

import os
from dotenv import load_dotenv
from deepgram import DeepgramClient
from deepgram.core.events import EventType


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


def main():
    """
    Main entry point for the Deepgram Voice Agent application.

    This function demonstrates the initialization pattern. The actual
    connection implementation will be added in subsequent subtasks.
    """
    try:
        # Initialize the Deepgram client with environment configuration
        client = initialize_deepgram_client()
        print("Deepgram client initialized successfully")

        # TODO: Connection implementation will be added in subtask-4-2
        # with client.agent.v1.connect() as connection:
        #     connection.send_settings(settings)
        #     connection.start_listening()

    except ValueError as e:
        print(f"Configuration error: {e}")
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
