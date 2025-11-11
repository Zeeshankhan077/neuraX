import json
import time
import urllib.request
import urllib.error
from typing import Any, Dict


SERVER_URL = "http://localhost:10000"


def http_post_json(url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def http_get_json(url: str) -> Dict[str, Any]:
    with urllib.request.urlopen(url, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> None:
    execute_url = f"{SERVER_URL}/execute"
    print(f"[TEST] POST {execute_url}")

    payload: Dict[str, Any] = {
        "mode": "ai",
        "code": (
            "# NeuraX Local Smoke Test\n"
            "print('NeuraX Local Test Successful!')\n"
            "print('OK Task Finished Successfully')\n"
        ),
        "file": None,
        "command": "",
        "args": "",
    }

    try:
        res = http_post_json(execute_url, payload)
    except urllib.error.URLError as e:
        print(f"[ERROR] Could not reach server at {SERVER_URL}: {e}")
        return

    job_id = res.get("job_id")
    if not job_id:
        print(f"[ERROR] Unexpected response: {res}")
        return

    print(f"[TEST] job_id = {job_id}")

    status_url = f"{SERVER_URL}/status/{job_id}"
    print(f"[TEST] Polling {status_url} ...")

    start_time = time.time()
    last_log_len = 0
    while True:
        try:
            status = http_get_json(status_url)
        except urllib.error.URLError as e:
            print(f"[WARN] Status fetch failed: {e}")
            time.sleep(1)
            continue

        state = status.get("status") or status.get("state")
        logs = status.get("logs", []) or []
        result = status.get("result")

        # Stream new logs
        if isinstance(logs, list):
            new = logs[last_log_len:]
            for line in new:
                print(f"[LOG] {line}")
            last_log_len = len(logs)

        if state in {"completed", "error", "failed"}:
            print(f"[TEST] Final state: {state}")
            if result is not None:
                print("[RESULT]")
                print(result)
            break

        if time.time() - start_time > 120:
            print("[ERROR] Timeout waiting for job to finish")
            break

        time.sleep(1)


if __name__ == "__main__":
    main()


