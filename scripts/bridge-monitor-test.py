import importlib.util
import tempfile
import unittest
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "integrations/openclaw/bridge-monitor.py"
spec = importlib.util.spec_from_file_location("bridge_monitor", path)
monitor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(monitor)


class BridgeMonitorTest(unittest.TestCase):
    def test_checks_heartbeat_age(self):
        now = monitor.heartbeat_timestamp("2026-11-25T21:00:00.000Z")
        self.assertTrue(monitor.is_healthy("2026-11-25T20:58:01.000Z", now))
        self.assertFalse(monitor.is_healthy("2026-11-25T20:58:00.000Z", now))
        self.assertFalse(monitor.is_healthy(None, now))
        with self.assertRaises(ValueError):
            monitor.is_healthy("2026-11-25T21:01:00.000Z", now)

    def test_notifies_each_recipient_once_and_retries_partial_failure(self):
        recipients = ["victor@example.test", "administracao@example.test"]
        sent = []

        def partial_send(recipient, healthy):
            if recipient == recipients[1]:
                raise OSError()
            sent.append((recipient, healthy))

        def send(recipient, healthy):
            sent.append((recipient, healthy))

        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / "status.json"
            self.assertTrue(monitor.notify_transition(state, recipients, True, send))
            self.assertFalse(monitor.notify_transition(state, recipients, False, partial_send))
            self.assertTrue(monitor.notify_transition(state, recipients, False, send))
            self.assertTrue(monitor.notify_transition(state, recipients, False, send))
            self.assertTrue(monitor.notify_transition(state, recipients, True, send))
            self.assertTrue(monitor.notify_transition(state, recipients, True, send))
            self.assertEqual(sent, [
                (recipients[0], False), (recipients[1], False),
                (recipients[0], True), (recipients[1], True),
            ])


if __name__ == "__main__":
    unittest.main()
