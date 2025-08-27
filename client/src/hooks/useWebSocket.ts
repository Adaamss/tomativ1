import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { MessageCircle } from "lucide-react";

export interface WebSocketMessage {
  id: string;
  senderId: string;
  receiverId: string;
  listingId?: string;
  content: string;
  createdAt: Date;
}

interface UseWebSocketReturn {
  sendMessage: (receiverId: string, content: string, listingId?: string) => void;
  messages: WebSocketMessage[];
  isConnected: boolean;
  clearMessages: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const { user } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  const connect = useCallback(() => {
    if (!user || ws.current?.readyState === WebSocket.CONNECTING || ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
      // Authenticate with user ID
      if (user && ws.current) {
        ws.current.send(JSON.stringify({
          type: 'auth',
          userId: user.id || user.sub
        }));
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_message') {
          setMessages(prev => [...prev, data.message]);
        } else if (data.type === 'message_sent') {
          setMessages(prev => [...prev, data.message]);
        } else if (data.type === 'auth_success') {
          console.log('WebSocket authenticated for user:', data.userId);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (user) {
          connect();
        }
      }, 3000);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  }, [user]);

  const sendMessage = useCallback((receiverId: string, content: string, listingId?: string) => {
    if (ws.current?.readyState === WebSocket.OPEN && user) {
      ws.current.send(JSON.stringify({
        type: 'send_message',
        receiverId,
        content,
        listingId
      }));
    }
  }, [user]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    if (user) {
      connect();
    }

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [user, connect]);

  return {
    sendMessage,
    messages,
    isConnected,
    clearMessages
  };
}