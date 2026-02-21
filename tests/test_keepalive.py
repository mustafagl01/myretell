"""
Test that keep_alive_loop sends KeepAlive every 8 seconds.
"""
import time
import threading
from unittest.mock import Mock
from backend.agent import keep_alive_loop


def test_keep_alive_interval_is_8_seconds():
    """Verify KeepAlive default interval is 8 seconds."""
    import inspect
    sig = inspect.signature(keep_alive_loop)
    interval_default = sig.parameters['interval'].default
    assert interval_default == 8, f"Expected default interval=8, got {interval_default}"


def test_keep_alive_sends_keepalive_messages():
    """Verify keep_alive_loop sends KeepAlive control messages."""
    connection = Mock()
    stop_event = threading.Event()

    # Start thread with shorter interval for testing (100ms instead of 8s)
    thread = threading.Thread(
        target=keep_alive_loop,
        args=(connection, stop_event, 0.1)
    )
    thread.start()

    # Wait and verify calls
    time.sleep(0.35)  # Should trigger ~3-4 calls in 350ms
    stop_event.set()
    thread.join(timeout=2)

    # Verify send_control was called
    assert connection.send_control.call_count >= 3, \
        f"Expected >=3 calls, got {connection.send_control.call_count}"

    # Verify the message type is 'KeepAlive'
    for call in connection.send_control.call_args_list:
        msg = call[0][0]
        assert hasattr(msg, 'type') and msg.type == 'KeepAlive', \
            f"Expected KeepAlive message, got {msg}"


if __name__ == "__main__":
    test_keep_alive_interval_is_8_seconds()
    test_keep_alive_sends_keepalive_messages()
    print("All tests passed!")
