"use client";
import { useState, useEffect, useRef } from "react";

type Msg = { id: string; text?: string; audioUrl?: string; time: string; me: boolean; };
type Contact = { id: string; name: string; number: string; online: boolean; messages: Msg[]; exists: boolean; };

export default function Page() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("Toutes");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [inputText, setInputText] = useState("");

  // Audio states
  const [isRecording, setIsRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const s = localStorage.getItem("voyez_v3");
    if (s) setContacts(JSON.parse(s));
  }, []);
  useEffect(() => { localStorage.setItem("voyez_v3", JSON.stringify(contacts)); }, [contacts]);

  const addContact = () => {
    if (!newName.trim() || !newNumber.trim()) return;
    const exists = newNumber.length >= 8;
    const c: Contact = {
      id: Date.now().toString(),
      name: newName,
      number: newNumber,
      online: exists, // si existe, on le met en ligne
      exists,
      messages: [{ id: "1", text: exists ? "Salut, je suis sur Voyez-vous !" : "Numéro non enregistré sur Voyez-vous", time: "10:00", me: false }]
    };
    setContacts([c, ...contacts]);
    setNewName(""); setNewNumber(""); setShowAdd(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/ogg; codecs=opus" });
        const url = URL.createObjectURL(blob);
        if (url && selected) {
          const newMsg: Msg = { id: Date.now().toString(), audioUrl: url, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), me: true };
          setContacts(prev => prev.map(c => c.id === selected.id ? { ...c, messages: [...c.messages, newMsg] } : c));
        }
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setIsRecording(true);
      setRecTime(0);
      timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
    } catch (e) { alert("Micro non autorisé"); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };
  const cancelRecording = () => {
    mediaRecorderRef.current?.stop();
    chunksRef.current = [];
    setIsRecording(false);
    setRecTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const sendText = () => {
    if (!inputText.trim() || !selected) return;
    const newMsg: Msg = { id: Date.now().toString(), text: inputText, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), me: true };
    setContacts(prev => prev.map(c => c.id === selected.id ? { ...c, messages: [...c.messages, newMsg] } : c));
    setInputText("");
  };

  const selected = contacts.find(c => c.id === selectedId);
  let filtered = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  if (filter === "Non lues") filtered = filtered.filter(c => c.messages.some(m => !m.me));

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Segoe UI, sans-serif", background: "#f0f2f5" }}>
      {/* ICONS */}
      <div style={{ width: "64px", background: "#f0f2f5", borderRight: "1px solid #e9edef", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "12px" }}>
        <div style={{ padding: "12px", background: "#f0f2f5", borderLeft: "4px solid #25D366", fontSize: "22px" }}>💬</div>
        <div style={{ padding: "12px", color: "#667781", fontSize: "12px" }}>Statut</div>
        <div style={{ padding: "12px", color: "#667781", fontSize: "12px" }}>Appels</div>
      </div>

      {/* LIST */}
      <div style={{ width: "360px", background: "white", display: "flex", flexDirection: "column" }}>
        <div style={{ height: "59px", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontWeight: 800, fontSize: "20px", margin: 0 }}>Voyez-vous</h1>
          <button onClick={() => setShowAdd(true)} style={{ width: "30px", height: "30px", borderRadius: "6px", border: "1px solid #e9edef", background: "white", cursor: "pointer" }}>+</button>
        </div>
        <div style={{ padding: "8px 12px" }}>
          <div style={{ background: "#f0f2f5", borderRadius: "8px", display: "flex", alignItems: "center", padding: "0 12px", height: "36px" }}>
            <span style={{ marginRight: "12px" }}>⌕</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher" style={{ background: "transparent", border: "none", outline: "none", width: "100%" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", padding: "8px 12px" }}>
          {["Toutes", "Non lues", "Favoris"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 12px", borderRadius: "20px", border: "none", cursor: "pointer", background: filter === f ? "#e7fce3" : "#f0f2f5", color: filter === f ? "#008069" : "#54656f" }}>{f}</button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", marginTop: "60px", color: "#667781" }}>
              <p>Aucune discussion</p><button onClick={() => setShowAdd(true)} style={{ marginTop: "12px", background: "#25D366", color: "white", border: "none", padding: "8px 16px", borderRadius: "20px", cursor: "pointer" }}>+ Ajouter un contact</button>
            </div>
          ) : filtered.map(c => (
            <div key={c.id} onClick={() => setSelectedId(c.id)} style={{ display: "flex", gap: "10px", padding: "10px 12px", cursor: "pointer", background: selectedId === c.id ? "#f0f2f5" : "white" }}>
              <div style={{ width: "49px", height: "49px", borderRadius: "50%", background: "#dfe5e7", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>{c.name[0].toUpperCase()}</div>
              <div style={{ flex: 1, borderBottom: "1px solid #f0f2f5" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><b>{c.name}</b><span style={{ fontSize: "11px", color: "#667781" }}>{c.messages[c.messages.length - 1]?.time}</span></div>
                <div style={{ fontSize: "13px", color: "#667781", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "180px" }}>{c.messages[c.messages.length - 1]?.text || "🎤 Message vocal"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT */}
      <div style={{ flex: 1, background: "#efeae2", display: "flex", flexDirection: "column" }}>
        {selected ? (
          <>
            {/* HEADER avec en ligne */}
            <div style={{ height: "59px", background: "#f0f2f5", display: "flex", alignItems: "center", padding: "0 16px", gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#dfe5e7", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>{selected.name[0].toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: 600 }}>{selected.name}</div>
                <div style={{ fontSize: "12px", color: selected.online ? "#25D366" : "#667781" }}>{selected.online ? "en ligne" : "hors ligne"} • {selected.number}</div>
              </div>
            </div>

            {/* MESSAGES */}
            <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {selected.messages.map(m => (
                <div key={m.id} style={{ alignSelf: m.me ? "flex-end" : "flex-start", background: m.me ? "#d9fdd3" : "white", padding: "8px 12px", borderRadius: "8px", maxWidth: "60%", boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)" }}>
                  {m.text && <span style={{ fontSize: "14px" }}>{m.text}</span>}
                  {m.audioUrl && <audio controls src={m.audioUrl} style={{ width: "200px" }} />}
                  <span style={{ fontSize: "11px", color: "#667781", marginLeft: "8px", float: "right", marginTop: "6px" }}>{m.time}</span>
                </div>
              ))}
            </div>

            {/* INPUT BAR - avec micro / triangle */}
            <div style={{ height: "62px", background: "#f0f2f5", display: "flex", alignItems: "center", padding: "0 16px", gap: "12px" }}>
              {isRecording ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "16px", background: "white", borderRadius: "24px", padding: "0 16px", height: "42px" }}>
                  <button onClick={cancelRecording} style={{ background: "transparent", border: "none", fontSize: "20px", cursor: "pointer" }}>🗑️</button>
                  <div style={{ width: "10px", height: "10px", background: "red", borderRadius: "50%" }}></div>
                  <span style={{ fontSize: "14px", color: "#111b21", flex: 1 }}>{formatTime(recTime)} • enregistrement...</span>
                  <button onClick={stopRecording} style={{ background: "#25D366", border: "none", width: "32px", height: "32px", borderRadius: "50%", color: "white", cursor: "pointer" }}>▶</button>
                </div>
              ) : (
                <>
                  <span style={{ fontSize: "22px", color: "#54656f", cursor: "pointer" }}>😊</span>
                  <span style={{ fontSize: "22px", color: "#54656f", cursor: "pointer" }}>📎</span>
                  <input value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendText()} placeholder="Entrez un message" style={{ flex: 1, height: "42px", borderRadius: "8px", border: "none", padding: "0 12px", outline: "none" }} />
                  {inputText.trim() ? (
                    <button onClick={sendText} style={{ background: "#25D366", border: "none", width: "42px", height: "42px", borderRadius: "50%", color: "white", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>➤</button>
                  ) : (
                    <button onClick={startRecording} style={{ background: "#25D366", border: "none", width: "42px", height: "42px", borderRadius: "50%", color: "white", fontSize: "20px", cursor: "pointer" }}>🎤</button>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: "#41525d" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 300 }}>Voyez-vous</h2><p style={{ color: "#667781" }}>Sélectionne un contact</p>
          </div>
        )}
      </div>

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99 }}>
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", width: "360px" }}>
            <h3 style={{ margin: "0 0 16px 0" }}>Nouveau contact</h3>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nom" style={{ width: "100%", boxSizing: "border-box", border: "1px solid #e9edef", borderRadius: "8px", padding: "12px", marginBottom: "12px" }} />
            <input value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="Numéro" style={{ width: "100%", boxSizing: "border-box", border: "1px solid #e9edef", borderRadius: "8px", padding: "12px", marginBottom: "16px" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: "8px 16px", border: "none", background: "transparent", cursor: "pointer" }}>Annuler</button>
              <button onClick={addContact} style={{ padding: "8px 20px", border: "none", background: "#25D366", color: "white", borderRadius: "20px", cursor: "pointer" }}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
