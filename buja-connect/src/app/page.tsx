"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null as any;

type UserAcc = { name: string; number: string; password: string; online: boolean; };
type Contact = { id: string; name: string; number: string; online: boolean; exists: boolean; };
type MsgDB = { id: string; from_number: string; to_number: string; text: string; audio_url?: string; is_read?: boolean; created_at: string; };
type Status = { id: string; user_number: string; user_name: string; text?: string; created_at: string; };

const normalize = (n: string) => n.replace(/\D/g, "").slice(-8);

export default function Page() {
  const [users, setUsers] = useState<UserAcc[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAcc | null>(null);
  const [authMode, setAuthMode] = useState<"login"|"signup">("login");
  const [aName, setAName] = useState(""); const [aNumber, setANumber] = useState(""); const [aPass, setAPass] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [tab, setTab] = useState<"disc" | "actu" | "comm" | "appels">("disc");
  const [search, setSearch] = useState(""); const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState(""); const [newNumber, setNewNumber] = useState("");
  const [inputText, setInputText] = useState(""); const [messages, setMessages] = useState<MsgDB[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]); const [showStatusAdd, setShowStatusAdd] = useState(false); const [statusText, setStatusText] = useState("");
  const [isRecording, setIsRecording] = useState(false); const [recTime, setRecTime] = useState(0); const [wave, setWave] = useState<number[]>(Array(20).fill(8));
  const [selectedMsg, setSelectedMsg] = useState<MsgDB | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); const chunksRef = useRef<Blob[]>([]); const timerRef = useRef<any>(null); const streamRef = useRef<MediaStream | null>(null); const analyserRef = useRef<AnalyserNode | null>(null); const animRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadUsers = async () => { if(!supabase){ const u=localStorage.getItem("buja_users_backup"); if(u) setUsers(JSON.parse(u)); return;} const {data}=await supabase.from("users").select("*"); if(data) setUsers(data as any); };
  const loadStatuses = async () => { if(!supabase) return; const {data}=await supabase.from("statuses").select("*").order("created_at",{ascending:false}); if(data) setStatuses(data); };
  const loadMessages = async () => { if(!supabase || !currentUser) return; const {data}=await supabase.from("messages").select("*").or(`from_number.eq.${currentUser.number},to_number.eq.${currentUser.number}`).order("created_at",{ascending:true}); if(data) setMessages(data); };

  useEffect(()=>{ loadUsers(); loadStatuses(); const c=localStorage.getItem("buja_contacts_v8"); if(c) setContacts(JSON.parse(c)); const cu=localStorage.getItem("buja_current_v8"); if(cu) setCurrentUser(JSON.parse(cu)); },[]);
  useEffect(()=>{ localStorage.setItem("buja_contacts_v8", JSON.stringify(contacts)); },[contacts]);
  useEffect(()=>{ if(currentUser) loadMessages(); const i=setInterval(()=>{ if(currentUser){ loadMessages(); loadUsers(); }},2500); return()=>clearInterval(i); },[currentUser, selected]);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages, selected]);

  useEffect(()=>{ if(!supabase || !selected || !currentUser) return; const unread = messages.filter(m=> normalize(m.from_number)===normalize(selected.number) && normalize(m.to_number)===normalize(currentUser.number) && !m.is_read); if(unread.length>0){ supabase.from("messages").update({is_read:true}).in("id", unread.map(u=>u.id)).then(()=>loadMessages()); } },[selected, messages]);

  const cleanedContacts = contacts.filter((c,i,arr)=> i===arr.findIndex(x=>normalize(x.number)===normalize(c.number)));

  const handleSignup = async () => { if(!aName||!aNumber||!aPass) return alert("Remplis tout"); if(!supabase){ const nu={name:aName, number:aNumber, password:aPass, online:true}; const all=[...users, nu]; setUsers(all); localStorage.setItem("buja_users_backup", JSON.stringify(all)); setCurrentUser(nu); localStorage.setItem("buja_current_v8", JSON.stringify(nu)); return;} const {error}=await supabase.from("users").insert([{name:aName, number:aNumber, password:aPass, online:true}]); if(error) return alert("Numéro déjà utilisé"); const nu={name:aName, number:aNumber, password:aPass, online:true}; setCurrentUser(nu); localStorage.setItem("buja_current_v8", JSON.stringify(nu)); };
  const handleLogin = async () => { if(!supabase){ const f=users.find(u=>normalize(u.number)===normalize(aNumber) && u.password===aPass); if(!f) return alert("Faux"); setCurrentUser(f); localStorage.setItem("buja_current_v8", JSON.stringify(f)); return;} const {data}=await supabase.from("users").select("*").eq("number", aNumber).eq("password", aPass).single(); if(!data) return alert("Faux"); await supabase.from("users").update({online:true}).eq("number", aNumber); setCurrentUser(data as any); localStorage.setItem("buja_current_v8", JSON.stringify(data)); };
  const logout = async () => { if(supabase && currentUser) await supabase.from("users").update({online:false}).eq("number", currentUser.number); setCurrentUser(null); setSelected(null); localStorage.removeItem("buja_current_v8"); };
  const addContact = async () => { if(!newName||!newNumber) return; await loadUsers(); const found=users.find(u=>normalize(u.number)===normalize(newNumber)); if(cleanedContacts.some(c=>normalize(c.number)===normalize(newNumber))) return alert("Déjà ajouté"); const c: Contact={id:Date.now().toString(), name:newName, number:newNumber, online:found?.online||false, exists:!!found}; setContacts([c, ...contacts]); setShowAdd(false); setNewName(""); setNewNumber(""); };
  const addStatus = async () => { if(!statusText.trim()||!currentUser||!supabase) return; await supabase.from("statuses").insert([{user_number:currentUser.number, user_name:currentUser.name, text:statusText}]); setStatusText(""); setShowStatusAdd(false); loadStatuses(); };
  const sendText = async () => { if(!inputText.trim()||!selected||!currentUser||!supabase) return; await supabase.from("messages").insert([{from_number:currentUser.number, to_number:selected.number, text:inputText, is_read:false}]); setInputText(""); loadMessages(); };
  const deleteMessage = async () => { if(!selectedMsg || !supabase) return; await supabase.from("messages").delete().eq("id", selectedMsg.id); setMessages(prev=>prev.filter(m=>m.id!==selectedMsg.id)); setSelectedMsg(null); };

  // AUDIO FIX FINAL
  const getSupportedMime = () => {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    for(const t of types){ try{ if((MediaRecorder as any).isTypeSupported(t)) return t; }catch{} }
    return "";
  };
  const blobToBase64 = (blob: Blob): Promise<string> => new Promise((res)=>{ const r=new FileReader(); r.onloadend=()=>res(r.result as string); r.readAsDataURL(blob); });

  const startRecording = async () => {
    if(isRecording){ stopRecording(); return; }
    try{
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      streamRef.current=stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser(); analyser.fftSize=128; source.connect(analyser); analyserRef.current=analyser;
      const updateWave = () => { if(!analyserRef.current) return; const arr=new Uint8Array(analyserRef.current.frequencyBinCount); analyserRef.current.getByteFrequencyData(arr); const newWave=Array.from({length:20},(_,i)=>{ const v=arr[i*2]||0; return Math.max(4, Math.min(28, v/5)); }); setWave(newWave); animRef.current=requestAnimationFrame(updateWave); }; updateWave();
      const mime = getSupportedMime();
      const mr = mime ? new MediaRecorder(stream, {mimeType:mime}) : new MediaRecorder(stream);
      mediaRecorderRef.current=mr; chunksRef.current=[];
      mr.ondataavailable=e=>{ if(e.data.size>0) chunksRef.current.push(e.data); };
      mr.onstop=async ()=>{
        cancelAnimationFrame(animRef.current);
        const blob = new Blob(chunksRef.current, {type: mr.mimeType || "audio/webm"});
        if(blob.size < 800){ stream.getTracks().forEach(t=>t.stop()); return; }
        const base64 = await blobToBase64(blob);
        if(base64.length > 900000){ alert("Vocal trop long (max 20s)"); stream.getTracks().forEach(t=>t.stop()); return; }
        if(selected && currentUser && supabase){ await supabase.from("messages").insert([{from_number:currentUser.number, to_number:selected.number, text:"🎤", audio_url:base64, is_read:false}]); loadMessages(); }
        stream.getTracks().forEach(t=>t.stop()); audioCtx.close(); setWave(Array(20).fill(8));
      };
      mr.start(100); setIsRecording(true); setRecTime(0); timerRef.current=setInterval(()=>setRecTime(s=>s+1),1000);
    }catch{ alert("Micro bloqué - autorise dans Paramètres"); }
  };
  const stopRecording = () => { if(mediaRecorderRef.current && isRecording){ mediaRecorderRef.current.stop(); setIsRecording(false); clearInterval(timerRef.current); cancelAnimationFrame(animRef.current); if(streamRef.current) streamRef.current.getTracks().forEach(t=>t.stop()); } };
  const cancelRecording = () => { if(mediaRecorderRef.current){ mediaRecorderRef.current.onstop=null; mediaRecorderRef.current.stop(); } setIsRecording(false); clearInterval(timerRef.current); cancelAnimationFrame(animRef.current); if(streamRef.current) streamRef.current.getTracks().forEach(t=>t.stop()); setWave(Array(20).fill(8)); };

  const chatMessages = messages.filter(m=> selected && ((normalize(m.from_number)===normalize(currentUser!.number) && normalize(m.to_number)===normalize(selected.number)) || (normalize(m.from_number)===normalize(selected.number) && normalize(m.to_number)===normalize(currentUser!.number))));

  if(!currentUser){
    return (
      <div style={{height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f0f2f5", padding:16}}>
        <div style={{background:"white", padding:28, borderRadius:20, width:"100%", maxWidth:380, boxShadow:"0 8px 30px rgba(0,0,0,0.12)"}}>
          <div style={{textAlign:"center", marginBottom:20}}><div style={{width:60, height:60, background:"#25D366", borderRadius:16, display:"inline-flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800, fontSize:28}}>B</div><h2 style={{margin:"10px 0 4px", color:"#111b21"}}>Buja Connect</h2></div>
          {authMode==="signup" && <input value={aName} onChange={e=>setAName(e.target.value)} placeholder="Ton nom" style={{width:"100%", padding:16, marginBottom:12, borderRadius:12, border:"2px solid #e9edef", background:"white", color:"#111b21", fontSize:16}}/>}
          <input value={aNumber} onChange={e=>setANumber(e.target.value)} placeholder="Numéro ex: 66465801" style={{width:"100%", padding:16, marginBottom:12, borderRadius:12, border:"2px solid #25D366", background:"#f6fff8", color:"#111b21", fontSize:16, fontWeight:600}}/>
          <input type="password" value={aPass} onChange={e=>setAPass(e.target.value)} placeholder="Mot de passe" style={{width:"100%", padding:16, marginBottom:16, borderRadius:12, border:"2px solid #e9edef", background:"white", color:"#111b21", fontSize:16}}/>
          <button onClick={authMode==="login"?handleLogin:handleSignup} style={{width:"100%", padding:16, background:"#25D366", color:"white", border:"none", borderRadius:12, fontWeight:800, fontSize:16}}>{authMode==="login"?"Se connecter":"Créer compte"}</button>
          <p style={{textAlign:"center", fontSize:14, marginTop:16, color:"#008069", fontWeight:700}} onClick={()=>setAuthMode(authMode==="login"?"signup":"login")}>{authMode==="login"?"Pas de compte ? S'inscrire →":"Déjà un compte ?"}</p>
        </div>
      </div>
    );
  }

  const showChatOnMobile = !!selected;

  return (
    <div style={{display:"flex", height:"100vh", width:"100vw", fontFamily:"-apple-system, sans-serif", background:"#fff", overflow:"hidden"}}>
      {/* LISTE */}
      <div style={{width:"100%", maxWidth:450, background:"white", display: showChatOnMobile ? "none" : "flex", flexDirection:"column"}}>
        <div style={{height:60, background:"#008069", color:"white", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px"}}><b style={{fontSize:20}}>Buja Connect</b><div style={{display:"flex", gap:16}}><span onClick={()=>setShowAdd(true)} style={{fontSize:22, cursor:"pointer"}}>＋</span><span onClick={logout} style={{fontSize:12, border:"1px solid white", padding:"4px 8px", borderRadius:12}}>Déco</span></div></div>
        {tab==="disc" && (<><div style={{padding:8, background:"#f0f2f5"}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher" style={{width:"100%", background:"white", border:"none", borderRadius:20, padding:"10px 16px", fontSize:15}}/></div><div style={{flex:1, overflowY:"auto"}}>{cleanedContacts.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())).map(c=>{ const lastMsg = [...messages].reverse().find(m=> normalize(m.from_number)===normalize(c.number) || normalize(m.to_number)===normalize(c.number)); return (<div key={c.id} onClick={()=>setSelected(c)} style={{display:"flex", gap:12, padding:"12px 16px", cursor:"pointer"}}><div style={{width:50, height:50, borderRadius:"50%", background:c.exists?"#d9fdd3":"#e9edef", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700}}>{c.name[0].toUpperCase()}</div><div style={{flex:1, borderBottom:"1px solid #f2f2f2", paddingBottom:12}}><div style={{display:"flex", justifyContent:"space-between"}}><b>{c.name}</b><span style={{fontSize:11, color:"#667781"}}>{lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}) : ""}</span></div><div style={{fontSize:13, color:c.exists?"#008069":"#e11", fontWeight:700}}>{c.number} • {c.exists?"Sur Buja":"Pas sur Buja"}</div><div style={{fontSize:14, color:"#667781", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:220}}>{lastMsg?.audio_url ? "🎤 Vocal" : lastMsg?.text || ""}</div></div></div>); })}</div></>)}
        {tab==="actu" && <div style={{flex:1, overflowY:"auto"}}><div style={{padding:16, display:"flex", gap:12}} onClick={()=>setShowStatusAdd(true)}><div style={{width:52, height:52, borderRadius:"50%", background:"#f0f2f5", border:"2px dashed #25D366", display:"flex", alignItems:"center", justifyContent:"center"}}>+</div><div><b>Mon statut</b></div></div>{statuses.map(s=><div key={s.id} style={{display:"flex", gap:12, padding:"12px 16px"}}><div style={{width:50, height:50, borderRadius:"50%", border:"3px solid #25D366", display:"flex", alignItems:"center", justifyContent:"center"}}>{s.user_name[0]}</div><div><b>{s.user_name}</b><div style={{fontSize:13}}>{s.text}</div></div></div>)}</div>}
        {tab==="comm" && <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center"}}>Bientôt</div>}
        {tab==="appels" && <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#888"}}>Aucun appel</div>}
        <div style={{height:70, borderTop:"1px solid #e9edef", display:"flex", background:"white"}}>{[{id:"disc", label:"Disc.", icon:"💬"},{id:"actu", label:"Actus", icon:"⭕"},{id:"comm", label:"Commu.", icon:"👥"},{id:"appels", label:"Appels", icon:"📞"}].map(t=>(<div key={t.id} onClick={()=>setTab(t.id as any)} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:tab===t.id?"#008069":"#667781", cursor:"pointer"}}><span style={{fontSize:22}}>{t.icon}</span><span style={{fontSize:11, fontWeight:tab===t.id?700:400}}>{t.label}</span></div>))}</div>
      </div>

      {/* CHAT */}
      {selected && (
        <div style={{flex:1, background:"#efeae2", display:"flex", flexDirection:"column", width:"100%"}}>
          <div style={{height:60, background:"#008069", color:"white", display:"flex", alignItems:"center", padding:"0 12px", gap:10}}><span onClick={()=>setSelected(null)} style={{fontSize:22, cursor:"pointer"}}>←</span><div style={{width:40, height:40, borderRadius:"50%", background:"white", color:"#008069", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700}}>{selected.name[0]}</div><div style={{flex:1}}><b>{selected.name}</b><div style={{fontSize:12, opacity:0.9}}>{selected.number}</div></div></div>
          <div style={{flex:1, padding:12, overflowY:"auto", display:"flex", flexDirection:"column", gap:8}}>
            {chatMessages.map(m=>{
              const isMe = normalize(m.from_number)===normalize(currentUser.number);
              const isRead = m.is_read;
              return (
                <div key={m.id} onClick={()=>setSelectedMsg(m)} style={{alignSelf:isMe?"flex-end":"flex-start", background:isMe?"#d9fdd3":"white", padding:"10px 12px", borderRadius:isMe?"8px 0 8px 8px":"0 8px 8px 8px", maxWidth:"82%", boxShadow:"0 1px 0.5px rgba(0,0,0,0.13)", cursor:"pointer"}}>
                  {m.audio_url ? (
                    <div style={{display:"flex", alignItems:"center", gap:8, minWidth:220}}>
                      <audio controls preload="metadata" playsInline style={{width:200, height:36}} src={m.audio_url} />
                    </div>
                  ) : (
                    <span style={{fontSize:15, color:"#111b21"}}>{m.text}</span>
                  )}
                  <div style={{fontSize:10, color: isMe && isRead ? "#53bdeb" : "#667781", textAlign:"right", marginTop:4, fontWeight: isMe && isRead ? 800 : 400}}>{new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})} {isMe && <span style={{color: isRead ? "#53bdeb" : "#667781"}}>{isRead ? "✓✓" : "✓✓"}</span>}</div>
                </div>
              );
            })}
            <div ref={endRef}/>
          </div>

          {/* BARRE ENREGISTREMENT WHATSAPP STYLE */}
          {isRecording ? (
            <div style={{height:62, background:"white", display:"flex", alignItems:"center", padding:"0 12px", gap:10, borderTop:"1px solid #e9edef"}}>
              <button onClick={cancelRecording} style={{width:40, height:40, borderRadius:"50%", background:"#f0f2f5", border:"none", fontSize:18}}>🗑️</button>
              <div style={{display:"flex", alignItems:"center", gap:2, flex:1}}>
                <span style={{width:10, height:10, background:"#f44336", borderRadius:"50%", animation:"pulse 1s infinite"}}></span>
                <span style={{fontSize:14, color:"#f44336", fontWeight:700, marginLeft:6}}>{String(Math.floor(recTime/60)).padStart(2,"0")}:{String(recTime%60).padStart(2,"0")}</span>
                <div style={{display:"flex", alignItems:"center", gap:2, marginLeft:12, flex:1}}>
                  {wave.map((h,i)=>(<div key={i} style={{width:3, height:`${h}px`, background: h>15 ? "#008069" : "#25D366", borderRadius:2, transition:"height 0.1s"}}/>))}
                </div>
              </div>
              <button onClick={stopRecording} style={{width:50, height:50, borderRadius:"50%", background:"#008069", color:"white", border:"none", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center"}}>▶</button>
            </div>
          ) : (
            <div style={{minHeight:62, background:"white", display:"flex", alignItems:"center", padding:"6px 8px", gap:8, borderTop:"1px solid #e9edef"}}>
              <div style={{flex:1, background:"#f0f2f5", borderRadius:24, display:"flex", alignItems:"center", padding:"0 12px", minHeight:46}}>
                <input value={inputText} onChange={e=>setInputText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendText()} placeholder="Message" style={{flex:1, border:"none", outline:"none", fontSize:16, background:"transparent", padding:"10px 0", color:"#111b21"}}/>
                <span style={{padding:"0 6px", fontSize:20, opacity:0.6}}>📎</span>
              </div>
              {inputText.trim() ? (
                <button onClick={sendText} style={{width:48, height:48, borderRadius:"50%", background:"#008069", color:"white", border:"none", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center"}}>➤</button>
              ) : (
                <button onClick={startRecording} style={{width:48, height:48, borderRadius:"50%", background:"#008069", color:"white", border:"none", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center"}}>🎤</button>
              )}
            </div>
          )}
        </div>
      )}

      {showAdd && (<div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:99}}><div style={{background:"white", width:"100%", maxWidth:450, borderRadius:"20px 20px 0 0", padding:24}}><h3>Nouveau contact</h3><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nom ex: YVES" style={{width:"100%", padding:16, marginBottom:12, borderRadius:12, border:"2px solid #e9edef", fontSize:16}}/><input value={newNumber} onChange={e=>setNewNumber(e.target.value)} placeholder="Numéro" style={{width:"100%", padding:16, marginBottom:16, borderRadius:12, border:"2px solid #25D366", background:"#f6fff8", fontSize:16}}/><div style={{display:"flex", gap:10}}><button onClick={()=>setShowAdd(false)} style={{flex:1, padding:14, borderRadius:12, border:"1px solid #ddd", background:"white"}}>Annuler</button><button onClick={addContact} style={{flex:1, padding:14, borderRadius:12, background:"#008069", color:"white", border:"none", fontWeight:700}}>Ajouter</button></div></div></div>)}
      {showStatusAdd && (<div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:99}}><div style={{background:"white", padding:24, borderRadius:16, width:"90%", maxWidth:340}}><h3>Nouveau statut</h3><textarea value={statusText} onChange={e=>setStatusText(e.target.value)} placeholder="Quoi de neuf ?" style={{width:"100%", height:100, padding:12, borderRadius:12, border:"2px solid #e9edef", fontSize:16}}/><div style={{display:"flex", gap:10, marginTop:12}}><button onClick={()=>setShowStatusAdd(false)} style={{flex:1, padding:12, borderRadius:12, border:"1px solid #ddd", background:"white"}}>Annuler</button><button onClick={addStatus} style={{flex:1, padding:12, borderRadius:12, background:"#008069", color:"white", border:"none"}}>Publier</button></div></div></div>)}
      
      {/* MENU SUPPRIMER MESSAGE */}
      {selectedMsg && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100}}>
          <div style={{background:"white", borderRadius:16, width:"85%", maxWidth:320, overflow:"hidden"}}>
            <div style={{padding:16, borderBottom:"1px solid #f0f2f5"}}><b>Message</b><div style={{fontSize:13, color:"#667781", marginTop:4, maxWidth:280, overflow:"hidden", textOverflow:"ellipsis"}}>{selectedMsg.audio_url ? "🎤 Message vocal" : selectedMsg.text}</div></div>
            {selectedMsg.audio_url && <button onClick={()=>{ const a=document.createElement("audio"); a.src=selectedMsg.audio_url!; a.play(); }} style={{width:"100%", padding:14, border:"none", background:"white", textAlign:"left", fontSize:15}}>▶️ Écouter</button>}
            <button onClick={deleteMessage} style={{width:"100%", padding:14, border:"none", background:"white", textAlign:"left", fontSize:15, color:"#f44336", borderTop:"1px solid #f0f2f5"}}>🗑️ Supprimer pour moi</button>
            <button onClick={()=>setSelectedMsg(null)} style={{width:"100%", padding:14, border:"none", background:"#f0f2f5", fontSize:15, fontWeight:600}}>Annuler</button>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse{0%{opacity:1}50%{opacity:0.4}100%{opacity:1}}`}</style>
    </div>
  );
}
