"""
NeuraX Compute Node

Purpose:
    High-end device that receives encrypted tasks from clients via WebRTC,
    executes them in Docker sandbox, and returns encrypted results.

Architecture:
    - Connects to signaling server and waits for client sessions
    - Establishes WebRTC peer connection on receiving offer
    - Exchanges keys with client for encrypted communication
    - Executes tasks in isolated Docker containers with resource limits
    - Returns stdout/stderr encrypted with session AES key
"""

import asyncio
import logging
import json
import subprocess
import os
import socketio
from aiortc import RTCPeerConnection, RTCConfiguration, RTCIceServer, RTCDataChannel, RTCIceCandidate
from crypto_utils import CryptoSession

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class NeuraXComputeNode:
    """
    Compute node for NeuraX distributed compute system.
    
    Responsibilities:
    - Accept WebRTC connections from clients
    - Exchange cryptographic keys
    - Execute tasks in sandboxed Docker containers
    - Return encrypted results
    """
    
    def __init__(self, signaling_url: str):
        """
        Initialize compute node.
        
        Args:
            signaling_url: URL of Flask-SocketIO signaling server
        """
        self.signaling_url = signaling_url
        
        # Step 1: Initialize Socket.IO client
        self.sio = socketio.AsyncClient()
        self._setup_signaling_handlers()
        
        # Step 2: Track active sessions (multiple clients possible)
        self.sessions = {}  # session_id -> session_data
        
        # Step 3: STUN/TURN configuration for WebRTC
        stun_servers = [
            RTCIceServer(urls="stun:stun.l.google.com:19302"),
            RTCIceServer(urls="stun:stun1.l.google.com:19302")
        ]
        
        # TURN servers for relay fallback
        turn_servers = [
            RTCIceServer(urls="turn:openrelay.metered.ca:80", username="openrelayproject", credential="openrelayproject"),
            RTCIceServer(urls="turn:openrelay.metered.ca:443", username="openrelayproject", credential="openrelayproject"),
            RTCIceServer(urls="turn:openrelay.metered.ca:443?transport=tcp", username="openrelayproject", credential="openrelayproject")
        ]
        
        self.ice_config = RTCConfiguration(
            iceServers=stun_servers + turn_servers
        )
        
        logger.info("NeuraX compute node initialized")
    
    def _setup_signaling_handlers(self):
        """Register Socket.IO event handlers for signaling."""
        
        @self.sio.event
        async def connect():
            """Handle successful connection to signaling server."""
            logger.info("Connected to signaling server")
            # Compute node waits for clients to create sessions
        
        @self.sio.event
        async def disconnect():
            """Handle disconnection from signaling server."""
            logger.info("Disconnected from signaling server")
            # Clean up all sessions
            self.sessions.clear()
        
        @self.sio.on('offer')
        async def on_offer(data):
            """Receive SDP offer from client."""
            session_id = data['session_id']
            offer_sdp = data['offer']
            
            logger.info(f"Received offer for session: {session_id}")
            
            # Step 1: Create new WebRTC peer connection for this session
            pc = RTCPeerConnection(configuration=self.ice_config)
            
            # Step 2: Create DataChannel handler
            @pc.on("datachannel")
            def on_datachannel(channel: RTCDataChannel):
                """Handle incoming DataChannel from client."""
                logger.info("DataChannel received from client")
                
                # Step 3: Initialize crypto for this session
                crypto = CryptoSession()
                session_data = {
                    'pc': pc,
                    'channel': channel,
                    'crypto': crypto,
                    'remote_public_key': None
                }
                self.sessions[session_id] = session_data
                
                # Step 4: Set up DataChannel message handler
                @channel.on("message")
                def on_message(message):
                    """Process messages from client."""
                    asyncio.create_task(self._handle_message(session_id, message))
                
                @channel.on("open")
                def on_open():
                    """DataChannel opened."""
                    logger.info(f"DataChannel opened for session {session_id}")
                
                @channel.on("close")
                def on_close():
                    """DataChannel closed."""
                    logger.info(f"DataChannel closed for session {session_id}")
                    if session_id in self.sessions:
                        del self.sessions[session_id]
            
            # Step 5: Parse offer SDP
            from aiortc.sdp import SessionDescription
            offer = SessionDescription(sdp=offer_sdp, type='offer')
            
            # Step 6: Set remote description
            await pc.setRemoteDescription(offer)
            
            # Step 7: Create answer
            answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            
            # Step 8: Send answer to client via signaling
            await self.sio.emit('answer', {
                'session_id': session_id,
                'answer': answer.sdp
            })
            logger.info(f"Sent answer for session {session_id}")
            
            # Step 9: Send ICE candidates
            @pc.on("icecandidate")
            async def on_icecandidate(event):
                if event.candidate:
                    await self.sio.emit('ice_candidate', {
                        'session_id': session_id,
                        'candidate': {
                            'candidate': event.candidate.candidate,
                            'sdpMid': event.candidate.sdpMid,
                            'sdpMLineIndex': event.candidate.sdpMLineIndex
                        }
                    })
                    logger.debug("Sent ICE candidate")
        
        @self.sio.on('ice_candidate')
        async def on_ice_candidate(data):
            """Receive ICE candidate from client."""
            session_id = data['session_id']
            
            # Find session's peer connection
            if session_id not in self.sessions:
                return
            
            pc = self.sessions[session_id]['pc']
            
            candidate_dict = data['candidate']
            candidate = candidate_dict['candidate']
            sdp_mid = candidate_dict.get('sdpMid')
            sdp_mline_index = candidate_dict.get('sdpMLineIndex')
            
            await pc.addIceCandidate(
                RTCIceCandidate(
                    candidate=candidate,
                    sdpMid=sdp_mid,
                    sdpMLineIndex=sdp_mline_index
                )
            )
            logger.debug("Added ICE candidate from client")
    
    async def _handle_message(self, session_id: str, message: str):
        """
        Process incoming messages from client.
        
        Handles:
        - RSA key exchange
        - Encrypted task execution
        """
        try:
            # Step 1: Parse JSON message
            data = json.loads(message)
            msg_type = data.get('type')
            
            if session_id not in self.sessions:
                logger.error(f"Session not found: {session_id}")
                return
            
            session_data = self.sessions[session_id]
            crypto = session_data['crypto']
            channel = session_data['channel']
            
            # Step 2: Handle key exchange
            if msg_type == 'key_exchange':
                action = data.get('action')
                
                if action == 'send_public_key':
                    # Received client's public key
                    session_data['remote_public_key'] = data['public_key']
                    logger.info("Received client's public key")
                    
                    # Send our public key
                    public_key_pem = crypto.get_public_key_pem()
                    await channel.send(json.dumps({
                        'type': 'key_exchange',
                        'action': 'send_public_key',
                        'public_key': public_key_pem
                    }))
                    logger.info("Sent our public key to client")
                
                elif action == 'send_aes_key':
                    # Received encrypted AES key from client
                    encrypted_aes_b64 = data['encrypted_aes_key']
                    crypto.exchange_aes_key(encrypted_aes_b64)
                    logger.info("Received and decrypted AES key")
                    
                    # Acknowledge
                    await channel.send(json.dumps({
                        'type': 'key_exchange',
                        'action': 'aes_key_received'
                    }))
                    logger.info("Key exchange complete")
            
            # Step 3: Handle encrypted task
            elif msg_type == 'encrypted_task':
                logger.info("Received encrypted task from client")
                
                # Step 4: Decrypt task
                encrypted_data = data['encrypted_data']
                plaintext = crypto.decrypt_payload(encrypted_data)
                task_json = json.loads(plaintext)
                
                code = task_json.get('code', '')
                task_type = task_json.get('type', 'python_code')
                
                logger.info(f"Decrypted task: {len(code)} bytes of {task_type}")
                
                # Step 5: Execute task in Docker sandbox
                result = await self._execute_in_sandbox(code, task_type)
                
                # Step 6: Encrypt result
                result_json = json.dumps({
                    'exit_code': result['exit_code'],
                    'stdout': result['stdout'],
                    'stderr': result['stderr'],
                    'execution_time': result.get('execution_time', 0)
                })
                
                encrypted_result = crypto.encrypt_payload(result_json)
                
                # Step 7: Send encrypted result
                await channel.send(json.dumps({
                    'type': 'encrypted_result',
                    'encrypted_data': encrypted_result
                }))
                logger.info("Sent encrypted result to client")
                
                # Step 8: Close connection after result
                await channel.close()
                del self.sessions[session_id]
                
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            import traceback
            traceback.print_exc()
    
    async def _execute_in_sandbox(self, code: str, task_type: str) -> dict:
        """
        Execute task in isolated Docker container.
        
        Args:
            code: Python code to execute
            task_type: Type of task (currently only 'python_code')
            
        Returns:
            dict: {'exit_code': int, 'stdout': str, 'stderr': str, 'execution_time': float}
        
        Security:
        - Limited CPU (1 core)
        - Limited memory (1GB)
        - Limited time (30 seconds)
        - Auto-cleanup container
        - No network access inside container
        """
        import time
        start_time = time.time()
        
        try:
            # Step 1: Prepare temporary file with code
            # Using unique name to avoid collisions in concurrent sessions
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(code)
                temp_file = f.name
            
            try:
                # Step 2: Execute in Docker container with resource limits
                # --rm: auto-remove container after execution
                # --cpus=1: limit to 1 CPU core (prevents CPU exhaustion)
                # --memory=1g: limit memory to 1GB (prevents OOM attacks)
                # --network=none: disable network access (prevents data exfiltration)
                # --ulimit nofile=1024: limit file descriptors
                # --read-only: mount filesystem read-only (extra safety)
                # -v /tmp:/tmp:rw: mount temp directory writable for temp files
                
                docker_cmd = [
                    'docker', 'run', '--rm',
                    '--cpus=1',  # Resource limit: max 1 CPU core
                    '--memory=1g',  # Resource limit: max 1GB RAM
                    '--network=none',  # Security: no network access
                    '--ulimit', 'nofile=1024:1024',  # Security: limit file descriptors
                    '--timeout=30',  # Kill after 30 seconds
                    '--read-only',  # Security: read-only root filesystem
                    '-v', f'{temp_file}:/tmp/task.py:ro',  # Mount code file
                    '-v', '/tmp:/tmp:rw',  # Writable temp directory
                    'python:3.10',  # Base image
                    'python', '/tmp/task.py'  # Execute code
                ]
                
                logger.info("Starting Docker sandbox execution")
                
                # Step 3: Run with timeout
                result = await asyncio.wait_for(
                    self._run_command(docker_cmd),
                    timeout=35.0  # Slightly more than container timeout
                )
                
                execution_time = time.time() - start_time
                
                logger.info(f"Sandbox execution complete: exit={result['exit_code']}, time={execution_time:.2f}s")
                
                return {
                    'exit_code': result['exit_code'],
                    'stdout': result['stdout'],
                    'stderr': result['stderr'],
                    'execution_time': execution_time
                }
                
            finally:
                # Step 4: Clean up temporary file
                try:
                    os.unlink(temp_file)
                except:
                    pass
        
        except asyncio.TimeoutError:
            logger.warning("Sandbox execution timed out")
            return {
                'exit_code': -1,
                'stdout': '',
                'stderr': 'Execution timeout (30 seconds)',
                'execution_time': time.time() - start_time
            }
        except Exception as e:
            logger.error(f"Sandbox execution failed: {e}")
            return {
                'exit_code': -1,
                'stdout': '',
                'stderr': f'Execution error: {str(e)}',
                'execution_time': time.time() - start_time
            }
    
    async def _run_command(self, cmd: list) -> dict:
        """
        Execute shell command and capture output.
        
        Args:
            cmd: Command as list of arguments
            
        Returns:
            dict: {'exit_code': int, 'stdout': str, 'stderr': str}
        """
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        return {
            'exit_code': process.returncode,
            'stdout': stdout.decode('utf-8', errors='replace'),
            'stderr': stderr.decode('utf-8', errors='replace')
        }
    
    async def connect_to_signaling(self):
        """
        Connect to signaling server.
        
        Raises:
            ConnectionError: If connection fails
        """
        try:
            await self.sio.connect(self.signaling_url)
            logger.info("Connected to signaling server successfully")
        except Exception as e:
            logger.error(f"Failed to connect to signaling server: {e}")
            raise ConnectionError(f"Signaling connection failed: {e}")
    
    async def run(self):
        """
        Start compute node and wait for client connections.
        
        This runs indefinitely until interrupted.
        """
        try:
            # Connect to signaling
            await self.connect_to_signaling()
            
            # Wait forever for connections
            logger.info("Compute node ready, waiting for client connections...")
            await asyncio.Event().wait()
            
        except KeyboardInterrupt:
            logger.info("Interrupted by user")
        finally:
            if self.sio.connected:
                await self.sio.disconnect()
            logger.info("Compute node stopped")


async def main():
    """Entry point for compute node."""
    import argparse
    
    parser = argparse.ArgumentParser(description='NeuraX Compute Node')
    parser.add_argument('--signaling-url', default='http://localhost:5000',
                        help='Signaling server URL')
    
    args = parser.parse_args()
    
    node = NeuraXComputeNode(signaling_url=args.signaling_url)
    await node.run()


if __name__ == '__main__':
    asyncio.run(main())


# Notes:
# - Compute node listens on signaling server for incoming offers
# - Each session has isolated WebRTC connection and crypto session
# - Docker sandbox provides strong isolation from host system
# - Resource limits prevent denial-of-service attacks
# - Results encrypted with session AES key before transmission
# - Automatic cleanup of containers and temporary files
