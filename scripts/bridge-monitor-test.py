import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

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

    def test_main_notifies_one_recipient(self):
        recipient = "victor@example.test"
        with tempfile.TemporaryDirectory() as directory:
            env = {
                "STATE_DIRECTORY": directory,
                "BRIDGE_ALERT_TO": recipient,
                "BRIDGE_MONITOR_SITE": "https://example.test",
                "BRIDGE_MONITOR_SECRET": "fixture",
            }
            with patch.object(monitor, "get_heartbeat", return_value=None), patch.object(monitor, "send_email") as send:
                self.assertTrue(monitor.main(env))
                self.assertTrue(monitor.main(env))
                send.assert_called_once_with(env, recipient, False)

    def test_envelope_uses_configured_alias_or_smtp_login(self):
        recipient = "victor@example.test"
        alias = "proxmox@example.test"
        env = {
            "BRIDGE_MONITOR_SITE": "https://example.test",
            "BRIDGE_SMTP_HOST": "smtp.example.test",
            "BRIDGE_SMTP_USER": recipient,
            "BRIDGE_SMTP_PASSWORD": "fixture",
        }
        for override, sender in [({"BRIDGE_ALERT_FROM": alias}, alias), ({}, recipient)]:
            with self.subTest(sender=sender), patch.object(monitor.smtplib, "SMTP") as connect:
                monitor.send_email({**env, **override}, recipient, False)
                smtp = connect.return_value
                smtp.login.assert_called_once_with(recipient, "fixture")
                message = smtp.send_message.call_args.args[0]
                self.assertEqual(message["From"], sender)
                self.assertEqual(message["To"], recipient)

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
