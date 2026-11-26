"""Monitor the Purchases bridge from a host outside its container."""

import fcntl
import http.client
import json
import os
import smtplib
import ssl
import sys
import tempfile
import time
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path
from urllib.parse import urlsplit

MAX_HEARTBEAT_AGE = 120


def heartbeat_timestamp(value):
    date = datetime.fromisoformat(value)
    if date.utcoffset() is None:
        raise ValueError("O horário do último contato precisa incluir fuso.")
    return date.timestamp()


def is_healthy(last_seen, now):
    if last_seen is None:
        return False
    age = now - heartbeat_timestamp(last_seen)
    if age < -30:
        raise ValueError("Horário do último contato fora da margem de sincronização.")
    return age < MAX_HEARTBEAT_AGE


def get_heartbeat(site, secret, sites_token=None):
    url = urlsplit(site)
    if (url.scheme != "https" or not url.hostname or url.username or url.password
            or url.query or url.fragment or url.path not in ("", "/")):
        raise ValueError("Informe a origem HTTPS do CEEA Manager.")
    headers = {"Authorization": f"Bearer {secret}", "Accept": "application/json"}
    if sites_token:
        headers["OAI-Sites-Authorization"] = f"Bearer {sites_token}"
    conn = http.client.HTTPSConnection(url.hostname, url.port, timeout=10)
    try:
        conn.request("GET", "/api/integrations/bridge/health", headers=headers)
        response = conn.getresponse()
        if response.status != 200:
            raise RuntimeError("O endpoint de monitoramento recusou a consulta.")
        return json.loads(response.read(4096))["lastSeenAt"]
    finally:
        conn.close()


def save_state(path, notifications):
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as temp:
        name = temp.name
        try:
            temp.write(json.dumps(notifications).encode())
            temp.flush()
            os.fsync(temp.fileno())
            os.replace(name, path)
        finally:
            Path(name).unlink(missing_ok=True)


def notify_transition(state, recipients, healthy, send):
    notifications = json.loads(state.read_text()) if state.exists() else {}
    delivered = True
    for recipient in recipients:
        if notifications.get(recipient, True) == healthy:
            continue
        try:
            send(recipient, healthy)
        except (OSError, smtplib.SMTPException):
            delivered = False
            continue
        notifications[recipient] = healthy
        save_state(state, notifications)
    return delivered


def send_email(env, recipient, healthy):
    message = EmailMessage()
    smtp_user = env.get("BRIDGE_SMTP_USER")
    sender = env.get("BRIDGE_ALERT_FROM") or smtp_user
    if not sender:
        raise ValueError("Configure o remetente ou o login SMTP.")
    message["From"] = sender
    message["To"] = recipient
    message["Subject"] = (
        "CEEA Manager: ponte de Compras voltou" if healthy
        else "CEEA Manager: ponte de Compras sem contato"
    )
    message.set_content(
        ("O CEEA Manager voltou a receber o sinal da ponte de Compras."
         if healthy else "O CEEA Manager deixou de receber o sinal da ponte de Compras.")
        + "\n\n" + env["BRIDGE_MONITOR_SITE"] + "\n"
    )

    context = ssl.create_default_context()
    host = env["BRIDGE_SMTP_HOST"]
    mode = env.get("BRIDGE_SMTP_TLS", "starttls")
    if mode not in ("implicit", "starttls"):
        raise ValueError("Modo TLS SMTP inválido.")
    port = int(env.get("BRIDGE_SMTP_PORT", 465 if mode == "implicit" else 587))
    smtp = (smtplib.SMTP_SSL(host, port, context=context, timeout=8)
            if mode == "implicit" else smtplib.SMTP(host, port, timeout=8))
    try:
        if mode == "starttls":
            smtp.starttls(context=context)
        if smtp_user:
            smtp.login(smtp_user, env["BRIDGE_SMTP_PASSWORD"])
        smtp.send_message(message)
    finally:
        smtp.close()


def main(env):
    state_dir = Path(env["STATE_DIRECTORY"])
    recipients = list(dict.fromkeys(
        address.strip() for address in env["BRIDGE_ALERT_TO"].split(",") if address.strip()
    ))
    if not 1 <= len(recipients) <= 2 or any(
        address.count("@") != 1 or any(char.isspace() for char in address)
        for address in recipients
    ):
        raise ValueError("Configure um ou dois destinatários autorizados.")
    with (state_dir / "monitor.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        last_seen = get_heartbeat(
            env["BRIDGE_MONITOR_SITE"], env["BRIDGE_MONITOR_SECRET"],
            env.get("BRIDGE_MONITOR_SITES_TOKEN"),
        )
        healthy = is_healthy(last_seen, time.time())
        return notify_transition(
            state_dir / "notifications.json", recipients, healthy,
            lambda recipient, current: send_email(env, recipient, current),
        )


if __name__ == "__main__":
    try:
        if not main(os.environ):
            sys.exit("O SMTP não aceitou todos os avisos pendentes. O próximo ciclo tentará novamente.")
    except (KeyError, TypeError, ValueError, OSError, RuntimeError, http.client.HTTPException):
        sys.exit("Não foi possível verificar a ponte. Confira acesso ao Site, relógio e configuração do monitor.")
