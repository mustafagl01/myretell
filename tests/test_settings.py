"""
Test agent settings configuration.
"""
from backend.agent import get_agent_settings


def test_agent_settings_returns_valid_object():
    """Verify get_agent_settings returns a properly configured settings object."""
    settings = get_agent_settings()

    # Verify it's the correct type
    from deepgram.extensions.types.sockets import AgentV1SettingsMessage
    assert isinstance(settings, AgentV1SettingsMessage)

    # Verify listen settings
    assert hasattr(settings, 'listen')
    assert settings.listen is not None

    # Verify think settings
    assert hasattr(settings, 'think')
    assert settings.think is not None

    # Verify speak settings
    assert hasattr(settings, 'speak')
    assert settings.speak is not None


def test_agent_settings_has_correct_models():
    """Verify agent settings use the correct models per spec."""
    settings = get_agent_settings()

    # Check listen model is nova-3
    listen = settings.listen if hasattr(settings, 'listen') else settings.get('listen', {})
    provider = listen.get('provider') if isinstance(listen, dict) else listen.provider
    model = provider.get('model') if isinstance(provider, dict) else provider.model
    assert model == 'nova-3', f"Expected nova-3, got {model}"

    # Check think model is gpt-4o-mini
    think = settings.think if hasattr(settings, 'think') else settings.get('think', {})
    provider = think.get('provider') if isinstance(think, dict) else think.provider
    model = provider.get('model') if isinstance(provider, dict) else provider.model
    assert model == 'gpt-4o-mini', f"Expected gpt-4o-mini, got {model}"

    # Check speak model is aura-2-thalia-en
    speak = settings.speak if hasattr(settings, 'speak') else settings.get('speak', {})
    provider = speak.get('provider') if isinstance(speak, dict) else speak.provider
    model = provider.get('model') if isinstance(provider, dict) else provider.model
    assert 'aura-2' in str(model), f"Expected aura-2 model, got {model}"


if __name__ == "__main__":
    test_agent_settings_returns_valid_object()
    test_agent_settings_has_correct_models()
    print("All tests passed!")
