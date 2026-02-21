"""
Test environment configuration loading.
"""
import os
from unittest.mock import patch
from backend.main import initialize_deepgram_client


def test_deepgram_api_key_required():
    """Verify that ValueError is raised if DEEPGRAM_API_KEY is not set."""
    # Temporarily unset the environment variable
    with patch.dict(os.environ, {}, clear=True):
        try:
            initialize_deepgram_client()
            assert False, "Expected ValueError when DEEPGRAM_API_KEY is not set"
        except ValueError as e:
            assert "DEEPGRAM_API_KEY" in str(e)


def test_deepgram_client_initializes_with_key():
    """Verify that DeepgramClient initializes when API key is set."""
    with patch.dict(os.environ, {'DEEPGRAM_API_KEY': 'test-key-123'}):
        client = initialize_deepgram_client()
        assert client is not None


if __name__ == "__main__":
    test_deepgram_api_key_required()
    test_deepgram_client_initializes_with_key()
    print("All tests passed!")
