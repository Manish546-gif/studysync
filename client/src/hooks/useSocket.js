import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// Socket helper for real-time room interactions.
// - `SOCKET_URL` comes from `VITE_SOCKET_URL`.
// - Client attaches `auth: { token }` on connect (expects server to validate JWT).
//
// Client-emitted events (server should handle):
// - 'join-room' (roomId)
// - 'leave-room' (roomId)
// - 'send-message' ({ text }) -> server should broadcast 'chat-message'
// - 'file-uploaded' ({ ...file }) -> server should broadcast 'new-file'
// - 'file-deleted' ({ fileId }) -> server should broadcast 'file-removed'
// - 'draw-action', 'move-action', 'undo-action', 'clear-whiteboard' (whiteboard events)
// - 'cursor-move' ({ x, y, userName })
// - 'live-path' / 'live-path-end' for live-drawing previews
//
// Server-emitted events (frontend expects):
// - 'room-users' (array of users)
// - 'chat-history' (array)
// - 'chat-message' (message)
// - 'new-file' / 'file-removed' (file updates)
// - whiteboard and cursor events listed above
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export function useSocket(roomId) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [roomUsers, setRoomUsers] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [remoteActions, setRemoteActions] = useState([]);
  const [livePaths, setLivePaths] = useState({});
  const [messages, setMessages] = useState([]);
  const [roomFiles, setRoomFiles] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !roomId) return;

    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-room', roomId);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('room-users', (users) => setRoomUsers(users));

    socket.on('chat-history', (history) => setMessages(Array.isArray(history) ? history : []));

    socket.on('chat-message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('whiteboard-state', (actions) => setRemoteActions(actions));

    socket.on('draw-action', (data) => {
      setRemoteActions((prev) => [...prev, data]);
    });

    socket.on('move-action', (data) => {
      setRemoteActions((prev) =>
        prev.map((a) => {
          if (a._id === data.actionId) {
            return { ...a, x: data.x, y: data.y };
          }
          return a;
        })
      );
    });

    socket.on('cursor-move', (data) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [data.socketId]: { x: data.x, y: data.y, name: data.userName },
      }));
    });

    socket.on('clear-whiteboard', () => setRemoteActions([]));

    socket.on('undo-action', (data) => {
      if (data.actionId) {
        setRemoteActions((prev) => prev.filter((a) => a._id !== data.actionId));
      }
    });

    socket.on('live-path', (data) => {
      if (data.socketId === socket.id) return;
      setLivePaths((prev) => ({
        ...prev,
        [data.socketId]: {
          type: data.type,
          points: data.points,
          color: data.color,
          strokeWidth: data.strokeWidth,
          socketId: data.socketId,
        },
      }));
    });

    socket.on('live-path-end', (data) => {
      setLivePaths((prev) => {
        const next = { ...prev };
        delete next[data.socketId];
        return next;
      });
    });

    socket.on('new-file', (file) => {
      setRoomFiles((prev) => {
        if (prev.some((f) => f._id === file._id)) return prev;
        return [...prev, file];
      });
    });

    socket.on('file-removed', (data) => {
      setRoomFiles((prev) => prev.filter((f) => f._id !== data.fileId));
    });

    return () => {
      socket.emit('leave-room', roomId);
      socket.disconnect();
      setConnected(false);
      setRoomUsers([]);
      setRemoteCursors({});
      setRemoteActions([]);
      setLivePaths({});
      setMessages([]);
      setRoomFiles([]);
    };
  }, [roomId]);

  const emitDraw = useCallback((action) => {
    // action: { _id, type, x, y, ... } — server should broadcast to other users
    socketRef.current?.emit('draw-action', action);
  }, []);

  const emitMove = useCallback((actionId, x, y) => {
    socketRef.current?.emit('move-action', { actionId, x, y });
  }, []);

  const emitCursor = useCallback((x, y) => {
    // payload: { x, y, userName }
    socketRef.current?.emit('cursor-move', { x, y });
  }, []);

  const emitClear = useCallback(() => {
    socketRef.current?.emit('clear-whiteboard');
  }, []);

  const emitUndo = useCallback((actionId) => {
    socketRef.current?.emit('undo-action', { actionId });
  }, []);

  const emitLivePath = useCallback((data) => {
    socketRef.current?.emit('live-path', data);
  }, []);

  const emitLivePathEnd = useCallback(() => {
    socketRef.current?.emit('live-path-end');
  }, []);

  const emitMessage = useCallback((text) => {
    // send chat message to server; server should append metadata (sender, time)
    socketRef.current?.emit('send-message', { text });
  }, []);

  const emitFileUploaded = useCallback((fileData) => {
    socketRef.current?.emit('file-uploaded', fileData);
  }, []);

  const emitFileDeleted = useCallback((fileId) => {
    socketRef.current?.emit('file-deleted', { fileId });
  }, []);

  return {
    socket: socketRef,
    connected,
    roomUsers,
    remoteCursors,
    remoteActions,
    setRemoteActions,
    livePaths: Object.values(livePaths),
    messages,
    roomFiles,
    setRoomFiles,
    emitDraw,
    emitMove,
    emitCursor,
    emitClear,
    emitUndo,
    emitLivePath,
    emitLivePathEnd,
    emitMessage,
    emitFileUploaded,
    emitFileDeleted,
  };
}
