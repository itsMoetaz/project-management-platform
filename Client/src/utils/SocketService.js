import { io } from 'socket.io-client';

// Create a singleton socket instance that persists across page navigations
class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnecting = false;
    this.listeners = new Map();
    this.userId = null;
  }

  // Initialize socket connection
  initialize(userId) {
    // Store user ID for reconnection
    this.userId = userId;
  
    // If socket already exists and is connected, don't create a new one
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected:', this.socket.id);
      return this.socket;
    }
  
    // Use the correct port
    const API_URL = import.meta.env.PROD 
      ? 'https://project-management-platform-fgcp.onrender.com' 
      : 'http://localhost:3000';    console.log("SocketService: Connecting to socket at:", API_URL);
    
    // Create new socket connection with better debugging
    try {
      this.socket = io(API_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'], // Allow fallback to polling
        upgrade: true,
        rememberUpgrade: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        timeout: 20000,
        forceNew: false,
        auth: {
          userId: this.userId
        },
        query: {
          userId: this.userId
        }
      });
  
      // Add connection event handlers
      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket.id);
        this.connected = true;
        this.reconnecting = false;
  // Join notification room
  if (this.userId) {
    console.log('SocketService: Joining notification room for user:', this.userId);
    this.socket.emit('join-notification-room', this.userId);
  }
  
  // Apply any stored listeners
  this.applyStoredListeners();
      });
  
      this.socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });
  
      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });
  
      return this.socket;
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      this.reconnecting = false;
      throw error;
    }
  }

  // Reconnect if disconnected
  reconnect() {
    if (this.reconnecting || !this.userId) return;
    
    console.log('SocketService: Attempting to reconnect');
    this.reconnecting = true;
    
    // Try to reconnect after a short delay
    setTimeout(() => {
      this.initialize(this.userId);
    }, 1000);
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }

  // Check if socket is connected
  isConnected() {
    return this.socket && this.connected;
  }

  // Store listeners that should be applied when socket reconnects
  applyStoredListeners() {
    if (!this.socket) return;
    
    // Apply all stored listeners to the socket
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket.on(event, callback);
      });
    });
  }

  // Add event listener
  on(event, callback) {
    // Store the listener for reconnection
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    // Only add if not already in the list
    const callbacks = this.listeners.get(event);
    if (!callbacks.includes(callback)) {
      callbacks.push(callback);
    }

    // If we have a socket, add the listener directly
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remove event listener
  off(event, callback) {
    // Remove from stored listeners
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }

    // Remove from socket if it exists
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Emit event
  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
      return true;
    }
    return false;
  }

  // Join a room
  joinRoom(roomName) {
    if (this.socket && this.connected) {
      this.socket.emit('join-room', roomName);
      return true;
    }
    return false;
  }

  // Clean up
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.reconnecting = false;
    }
  }
}

// Create singleton instance
const socketService = new SocketService();
export default socketService;