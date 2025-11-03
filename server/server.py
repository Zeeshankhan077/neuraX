import os
import json
import logging
import threading
import eventlet
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
from datetime import datetime

# Monkey patch for async compatibility
eventlet.monkey_patch()

# =====================================================
# ✅ CONFIGURATION
# =====================================================
app = Flask(_name_)
CORS(app, resources={r"/": {"origins": ""}})

app.config["OUTPUT_FOLDER"] = "outputs"
os.makedirs(app.config["OUTPUT_FOLDER"], exist_ok=True)

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="eventlet",
    logger=True,
    engineio_logger=False
)

# =====================================================
# ✅ GLOBAL STATE
# =====================================================
jobs = {}           # job_id -> job_data
compute_nodes = {}  # node_id -> node_specs

# =====================================================
# ✅ LOGGING CONFIG
# =====================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("NeuraX-Server")

# =====================================================
# ✅ REST API ENDPOINTS
# =====================================================
@app.route('/')
def health_check():
    """Basic health check route."""
    return jsonify({
        "status": "online",
        "message": "NeuraX Cloud Compute Server Active 🚀"
    })


@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    """Return all active jobs."""
    return jsonify({"jobs": jobs})


@app.route('/api/nodes', methods=['GET'])
def get_nodes():
    """Return all registered compute nodes."""
    return jsonify({"nodes": compute_nodes})


# =====================================================
# ✅ SOCKET.IO EVENTS
# =====================================================
@socketio.on('connect')
def handle_connect():
    logger.info(f"🔗 Client connected: {request.sid}")
    socketio.emit('connected', {"message": "Connected to NeuraX server"})


@socketio.on('disconnect')
def handle_disconnect():
    logger.info(f"❌ Client disconnected: {request.sid}")
    # Clean up compute node entries
    for node_id, data in list(compute_nodes.items()):
        if data.get("sid") == request.sid:
            del compute_nodes[node_id]
            logger.info(f"Node {node_id} removed (disconnected)")
            break
    socketio.emit("compute_nodes_list", {"nodes": list(compute_nodes.keys())})


@socketio.on('register_node')
def handle_register_node(data):
    """Register compute node."""
    node_id = data.get('node_id')
    specs = data.get('specs', {})
    compute_nodes[node_id] = {"sid": request.sid, "specs": specs}
    logger.info(f"✅ Registered compute node: {node_id}")
    socketio.emit("compute_nodes_list", {"nodes": list(compute_nodes.keys())})


@socketio.on('get_compute_nodes')
def handle_get_compute_nodes():
    """Send all available compute nodes to frontend."""
    socketio.emit("compute_nodes_list", {"nodes": list(compute_nodes.keys())})


@socketio.on('submit_job')
def handle_submit_job(data):
    """Handle a new job submission."""
    job_id = f"job_{datetime.now().strftime('%H%M%S_%f')}"
    code = data.get("code", "")
    node_id = data.get("node_id", "unknown")

    logger.info(f"🧠 New job submitted: {job_id} -> {node_id}")

    jobs[job_id] = {
        "id": job_id,
        "node": node_id,
        "status": "queued",
        "output": "",
        "logs": []
    }

    socketio.emit("job_status", {"job_id": job_id, "status": "queued"})
    threading.Thread(target=execute_job_async, args=(job_id, code, node_id)).start()


# =====================================================
# ✅ JOB EXECUTION SIMULATION
# =====================================================
def execute_job_async(job_id, code, node_id):
    """Simulate or handle job execution asynchronously."""
    try:
        add_log(job_id, "⚙ Job started on node " + node_id)

        # Simulate compute time
        import time
        time.sleep(2)

        output = f"✅ Job executed successfully on {node_id}"
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["output"] = output
        add_log(job_id, output)

        socketio.emit("job_status", {"job_id": job_id, "status": "completed"})
    except Exception as e:
        logger.exception("Job execution failed")
        jobs[job_id]["status"] = "error"
        add_log(job_id, f"❌ [ERROR] {str(e)}")
        socketio.emit("job_status", {"job_id": job_id, "status": "error"})


# =====================================================
# ✅ LOGGING HANDLER
# =====================================================
def add_log(job_id, log):
    timestamp = datetime.now().strftime("[%H:%M:%S]")
    message = f"{timestamp} {log}"
    jobs[job_id]["logs"].append(message)
    socketio.emit("job_log", {"job_id": job_id, "log": message})


# =====================================================
# ✅ RUN SERVER
# =====================================================
if _name_ == "_main_":
    PORT = int(os.environ.get("PORT", 10000))
    logger.info(f"🚀 Starting NeuraX Cloud Compute Server on port {PORT}")
    socketio.run(app, host="0.0.0.0", port=PORT)
