import React, { useEffect, useRef, useState } from "react";
import { Minimize2, MessageCircle } from "lucide-react";

type Message = { id: string; from: "user" | "assistant"; text: string };

export default function AiChatBox({ contextProvider }: { contextProvider?: () => any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [minimized, setMinimized] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('ai-chat-minimized');
      return v === '1';
    } catch (e) { return false; }
  });

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const startStream = async (id: string) => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    const es = new EventSource(`/stream/${id}`);
    eventSourceRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === "chunk") {
          setMessages((m) => {
            const last = m[m.length - 1];
            if (last && last.from === "assistant") {
              return [...m.slice(0, -1), { ...last, text: last.text + data.text }];
            }
            return [...m, { id: String(Date.now()), from: "assistant", text: data.text }];
          });
        } else if (data.event === "done") {
          es.close();
        }
      } catch (err) {
        console.error(err);
      }
    };
    es.onerror = () => {
      es.close();
    };
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { id: String(Date.now()), from: "user", text: input };
    setMessages((m) => [...m, userMsg, { id: String(Date.now() + 1), from: "assistant", text: "" }]);

    // send to server
    const context = contextProvider ? contextProvider() : {};
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input, context }),
    });
    const body = await res.json();
    if (body && body.id) {
      setSessionId(body.id);
      startStream(body.id);
    }

    setInput("");
  };

  const toggleMinimize = () => {
    setMinimized(m => {
      const next = !m;
      try { localStorage.setItem('ai-chat-minimized', next ? '1' : '0'); } catch (e) {}
      return next;
    });
  };

  if (minimized) {
    return (
      <div style={{position:'fixed',right:20,bottom:20,zIndex:70}}>
        <button onClick={toggleMinimize} className="ps5-panel" style={{width:56,height:56,borderRadius:999,display:'flex',alignItems:'center',justifyContent:'center'}} aria-label="Open AI chat">
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div style={{position:'fixed',right:20,bottom:20,width:360,zIndex:60}}>
      <div className="ps5-panel p-3" style={{display:'flex',flexDirection:'column',gap:8}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <strong>AI Assistant</strong>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <small className="muted">Realtime</small>
            <button onClick={toggleMinimize} aria-label="Minimize chat" style={{background:'transparent',border:'none'}}>
              <Minimize2 />
            </button>
          </div>
        </div>

        <div ref={listRef} style={{maxHeight:260,overflowY:'auto',padding:8,background:'rgba(255,255,255,0.6)',borderRadius:8}}>
          {messages.map((m) => (
            <div key={m.id} style={{marginBottom:8,display:'flex',flexDirection:'column'}}>
              <div style={{fontSize:12,fontWeight:700,color:m.from==='user'?'#0f172a':'var(--accent)'}}>{m.from}</div>
              <div style={{background:m.from==='user'?'#f3f4f6':'#ffffff',padding:8,borderRadius:8,whiteSpace:'pre-wrap'}}>{m.text}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:8}}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about the uploaded file or plugins..." className="flex-1 px-3 py-2 rounded-lg" />
          <button className="ps5-btn" onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}
