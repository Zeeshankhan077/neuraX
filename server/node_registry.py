"""
NeuraX Node Registry (SQLite)

Manages compute node registration, heartbeat tracking, and cleanup.
Optimized for Tailscale Free plan with efficient device usage.
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import threading

logger = logging.getLogger(__name__)


class NodeRegistry:
    """
    SQLite-based node registry for tracking compute nodes.
    
    Features:
    - Node registration with Tailscale IP
    - Heartbeat tracking
    - Automatic cleanup of stale nodes
    - Device count monitoring (for Tailscale free plan limits)
    """
    
    def __init__(self, db_path: str = "neurax_nodes.db", heartbeat_timeout: int = 300):
        """
        Initialize node registry.
        
        Args:
            db_path: Path to SQLite database file
            heartbeat_timeout: Seconds before marking node as offline (default: 300 = 5 min)
        """
        self.db_path = db_path
        self.heartbeat_timeout = heartbeat_timeout
        self.lock = threading.Lock()
        
        # Initialize database
        self._init_db()
        
        # Start cleanup thread
        self._start_cleanup_thread()
    
    def _init_db(self):
        """Create database tables if they don't exist."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS nodes (
                    node_id TEXT PRIMARY KEY,
                    tailscale_ip TEXT,
                    device_name TEXT,
                    gpu TEXT,
                    vram_gb INTEGER,
                    installed_tools TEXT,  -- JSON array
                    status TEXT,
                    registered_at TEXT,
                    last_heartbeat TEXT,
                    socketio_sid TEXT,     -- For Socket.IO fallback nodes
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_last_heartbeat 
                ON nodes(last_heartbeat)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_tailscale_ip 
                ON nodes(tailscale_ip)
            """)
            
            conn.commit()
            logger.info(f"Initialized node registry database: {self.db_path}")
    
    def register_node(
        self,
        node_id: str,
        tailscale_ip: Optional[str] = None,
        device_name: str = "Unknown",
        gpu: str = "N/A",
        vram_gb: int = 0,
        installed_tools: List[str] = None,
        status: str = "ready",
        socketio_sid: Optional[str] = None
    ) -> bool:
        """
        Register or update a compute node.
        
        Args:
            node_id: Unique node identifier
            tailscale_ip: Tailscale IP (100.x.x.x) if available
            device_name: Human-readable device name
            gpu: GPU model/description
            vram_gb: VRAM in GB
            installed_tools: List of installed tools (e.g., ["python3", "blender"])
            status: Node status ("ready", "busy", "offline")
            socketio_sid: Socket.IO session ID (for fallback nodes)
        
        Returns:
            True if successful
        """
        with self.lock:
            try:
                now = datetime.utcnow().isoformat()
                tools_json = json.dumps(installed_tools or [])
                
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute("""
                        INSERT OR REPLACE INTO nodes 
                        (node_id, tailscale_ip, device_name, gpu, vram_gb, 
                         installed_tools, status, registered_at, last_heartbeat, socketio_sid)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        node_id, tailscale_ip, device_name, gpu, vram_gb,
                        tools_json, status, now, now, socketio_sid
                    ))
                    conn.commit()
                
                logger.info(f"Registered node: {node_id} ({device_name}) - Tailscale IP: {tailscale_ip or 'N/A'}")
                return True
                
            except Exception as e:
                logger.error(f"Failed to register node {node_id}: {e}")
                return False
    
    def update_heartbeat(self, node_id: str) -> bool:
        """
        Update node heartbeat timestamp.
        
        Args:
            node_id: Node identifier
        
        Returns:
            True if node exists and heartbeat updated
        """
        with self.lock:
            try:
                now = datetime.utcnow().isoformat()
                
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.execute("""
                        UPDATE nodes 
                        SET last_heartbeat = ?, status = 'ready'
                        WHERE node_id = ?
                    """, (now, node_id))
                    conn.commit()
                    
                    if cursor.rowcount > 0:
                        return True
                    else:
                        logger.warning(f"Heartbeat update failed: node {node_id} not found")
                        return False
                        
            except Exception as e:
                logger.error(f"Failed to update heartbeat for {node_id}: {e}")
                return False
    
    def get_node(self, node_id: str) -> Optional[Dict]:
        """
        Get node information.
        
        Args:
            node_id: Node identifier
        
        Returns:
            Node dict or None if not found
        """
        with self.lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.row_factory = sqlite3.Row
                    cursor = conn.execute("""
                        SELECT * FROM nodes WHERE node_id = ?
                    """, (node_id,))
                    row = cursor.fetchone()
                    
                    if row:
                        node = dict(row)
                        node['installed_tools'] = json.loads(node['installed_tools'])
                        return node
                    return None
                    
            except Exception as e:
                logger.error(f"Failed to get node {node_id}: {e}")
                return None
    
    def get_all_nodes(self, active_only: bool = True) -> List[Dict]:
        """
        Get all registered nodes.
        
        Args:
            active_only: If True, only return nodes with recent heartbeat
        
        Returns:
            List of node dicts
        """
        with self.lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.row_factory = sqlite3.Row
                    
                    if active_only:
                        # Only nodes with heartbeat within timeout
                        cutoff = (datetime.utcnow() - timedelta(seconds=self.heartbeat_timeout)).isoformat()
                        cursor = conn.execute("""
                            SELECT * FROM nodes 
                            WHERE last_heartbeat > ?
                            ORDER BY last_heartbeat DESC
                        """, (cutoff,))
                    else:
                        cursor = conn.execute("SELECT * FROM nodes ORDER BY last_heartbeat DESC")
                    
                    rows = cursor.fetchall()
                    nodes = []
                    for row in rows:
                        node = dict(row)
                        node['installed_tools'] = json.loads(node['installed_tools'])
                        nodes.append(node)
                    
                    return nodes
                    
            except Exception as e:
                logger.error(f"Failed to get nodes: {e}")
                return []
    
    def get_nodes_by_tailscale_ip(self, tailscale_ip: str) -> List[Dict]:
        """Get all nodes with a specific Tailscale IP."""
        with self.lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.row_factory = sqlite3.Row
                    cursor = conn.execute("""
                        SELECT * FROM nodes WHERE tailscale_ip = ?
                    """, (tailscale_ip,))
                    rows = cursor.fetchall()
                    nodes = []
                    for row in rows:
                        node = dict(row)
                        node['installed_tools'] = json.loads(row['installed_tools'])
                        nodes.append(node)
                    return nodes
            except Exception as e:
                logger.error(f"Failed to get nodes by Tailscale IP: {e}")
                return []
    
    def cleanup_stale_nodes(self) -> int:
        """
        Remove nodes that haven't sent heartbeat within timeout.
        
        Returns:
            Number of nodes removed
        """
        with self.lock:
            try:
                cutoff = (datetime.utcnow() - timedelta(seconds=self.heartbeat_timeout)).isoformat()
                
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.execute("""
                        UPDATE nodes 
                        SET status = 'offline'
                        WHERE last_heartbeat < ? AND status != 'offline'
                    """, (cutoff,))
                    removed = cursor.rowcount
                    conn.commit()
                    
                    if removed > 0:
                        logger.info(f"Marked {removed} stale nodes as offline")
                    
                    return removed
                    
            except Exception as e:
                logger.error(f"Failed to cleanup stale nodes: {e}")
                return 0
    
    def get_device_count(self) -> int:
        """Get total number of registered devices (for Tailscale free plan monitoring)."""
        with self.lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.execute("SELECT COUNT(DISTINCT tailscale_ip) FROM nodes WHERE tailscale_ip IS NOT NULL")
                    count = cursor.fetchone()[0]
                    return count
            except Exception as e:
                logger.error(f"Failed to get device count: {e}")
                return 0
    
    def _start_cleanup_thread(self):
        """Start background thread for periodic cleanup."""
        def cleanup_loop():
            import time
            while True:
                time.sleep(60)  # Run cleanup every minute
                self.cleanup_stale_nodes()
        
        thread = threading.Thread(target=cleanup_loop, daemon=True)
        thread.start()
        logger.info("Started cleanup thread")





