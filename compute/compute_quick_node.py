import os
import asyncio
import socketio
import platform


sio = socketio.AsyncClient(
    reconnection=True,
    reconnection_attempts=0,
    reconnection_delay=1,
    reconnection_delay_max=10,
)


@sio.event
async def connect():
    print("✅ Connected to server")
    specs = {
        "device": platform.node(),
        "gpu": "N/A",
        "installed_tools": ["python3"],
        "status": "ready",
    }
    await sio.emit("register_compute_node", specs)
    print("🚀 Registered compute node")


@sio.event
async def disconnect():
    print("🔌 Disconnected")


async def main():
    url = os.getenv("SIGNALING_SERVER_URL", "https://neurax-server.onrender.com")
    print("Connecting to:", url)
    await sio.connect(url, transports=["websocket", "polling"], wait_timeout=10)
    print("🎯 Ready. Press Ctrl+C to exit.")
    try:
        while True:
            await asyncio.sleep(10)
    finally:
        if sio.connected:
            await sio.disconnect()


if __name__ == "__main__":
    asyncio.run(main())


