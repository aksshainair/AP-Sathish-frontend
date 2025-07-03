import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  return useContext(WebSocketContext);
};

const WS_URL = import.meta.env.VITE_WS_URL;
// const WS_URL = "ws://localhost:8000/ws";

export const WebSocketProvider = ({ children }) => {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    if (!wsRef.current) {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Shared WebSocket Connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        setLastMessage(event);
      };

      ws.onerror = (error) => {
        console.error('Shared WebSocket Error:', error);
      };

      ws.onclose = () => {
        console.log('Shared WebSocket Disconnected');
        setIsConnected(false);
        wsRef.current = null; // Clean up on close
      };
    }

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  const value = {
    ws: wsRef.current,
    isConnected,
    lastMessage,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}; 