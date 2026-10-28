"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null as any;

type UserAcc = { name: string; number: string; password: string; online: boolean; };
type Contact = { id: string; name: string; number: string; online: boolean; exists: boolean; };
type MsgDB = { id: string; from_number: string; to_number: string; text: string; audio_url?: string; is_read?: boolean; created_at: string; is_important?: boolean; };
type Status = { id: string; user_number: string; user_name: string; text?: string; created_at: string; };
type Call = { id: string; from_number: string; to_number: string; to_name: string; type: string; status: string; created_at: string; };

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
  const [statuses, setStatuses] = useState<Status[]>([]); const [calls, setCalls] = useState<Call[]>([]);
  const [showStatusAdd, setShowStatusAdd] = useState(false); const [statusText, setStatusText] = useState("");
  const [isRecording, setIsRecording] = useState(false); const [recTime, setRecTime] = useState(0); const [wave, setWave] = useState<number[]>(Array(20).fill(8));
  const [selectedMsg, setSelectedMsg] = useState<MsgDB | null>(null);
  const [replyTo, setReplyTo] = useState<MsgDB | null>(null);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showForward, setShowForward] = useState<MsgDB | null>(null);
  const [showReaction, setShowReaction] = useState<MsgDB | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); const chunksRef = useRef<Blob[]>([]); const timerRef = useRef<any>(null); const streamRef = useRef<MediaStream | null>(null); const animRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadUsers = async () => { if(!supabase){ const u=localStorage.getItem("buja_users_backup"); if(u) setUsers(JSON.parse(u)); return;} const {data}=await supabase.from("users").select("*"); if(data) setUsers(data as any); };
  const loadStatuses = async () => { if(!supabase) return; const {data}=await supabase.from("statuses").select("*").order("created_at",{ascending:false}); if(data) setStatuses(data); };
  const loadCalls = async () => { if(!supabase || !currentUser) return; const {data}=await supabase.from("calls").select("*").or(`from_number.eq.${currentUser.number},to_number.eq.${currentUser.number}`).order("created_at",{ascending:false}); if(data) setCalls(data); };
  const loadMessages = async () => { if(!supabase || !currentUser) return; const {data}=await supabase.from("messages").select("*").or(`from_number.eq.${currentUser.number},to_number.eq.${currentUser.number}`).order("created_at",{ascending:true}); if(data) setMessages(data); };

  useEffect(()=>{ loadUsers(); loadStatuses(); const c=localStorage.getItem("buja_contacts_v8"); if(c) setContacts(JSON.parse(c)); const cu=localStorage.getItem("buja_current_v8"); if(cu) setCurrentUser(JSON.parse(cu)); },[]);
  useEffect(()=>{ localStorage.setItem("buja_contacts_v8", JSON.stringify(contacts)); },[contacts]);
  useEffect(()=>{ if(currentUser){ loadMessages(); loadCalls(); } const i=setInterval(()=>{ if(currentUser){ loadMessages(); loadUsers(); loadCalls(); }},2500); return()=>clearInterval(i); },[currentUser, selected]);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages, selected]);
  useEffect(()=>{ if(!supabase || !selected || !currentUser) return; const unread = messages.filter(m=> normalize(m.from_number)===normalize(selected.number) && normalize(m.to_number)===normalize(currentUser.number) && !m.is_read); if(unread.length>0){ supabase.from("messages").update({is_read:true}).in("id", unread.map(u=>u.id)).then(()=>loadMessages()); } },[selected, messages]);

  const cleanedContacts = contacts.filter((c,i,arr)=> i===arr.findIndex(x=>normalize(x.number)===normalize(c.number)));

  const handleSignup = async () => { if(!aName||!aNumber||!aPass) return alert("Remplis tout"); if(!supabase){ const nu={name:aName, number:aNumber, password:aPass, online:true}; const all=[...users, nu]; setUsers(all); localStorage.setItem("buja_users_backup", JSON.stringify(all)); setCurrentUser(nu); localStorage.setItem("buja_current_v8", JSON.stringify(nu)); return;} const {error}=await supabase.from("users").insert([{name:aName, number:aNumber, password:aPass, online:true}]); if(error) return alert("Numéro déjà utilisé"); const nu={name:aName, number:aNumber, password:aPass, online:true}; setCurrentUser(nu); localStorage.setItem("buja_current_v8", JSON.stringify(nu)); };
  const handleLogin = async () => { if(!supabase){ const f=users.find(u=>normalize(u.number)===normalize(aNumber) && u.password===aPass); if(!f) return alert("Faux"); setCurrentUser(f); localStorage.setItem("buja_current_v8", JSON.stringify(f)); return;} const {data}=await supabase.from("users").select("*").eq("number", aNumber).eq("password", aPass).single(); if(!data) return alert("Faux"); await supabase.from("users").update({online:true}).eq("number", aNumber); setCurrentUser(data as any); localStorage.setItem("buja_current_v8", JSON.stringify(data)); };
  const logout = async () => { if(supabase && currentUser) await supabase.from("users").update({online:false}).eq("number", currentUser.number); setCurrentUser(null); setSelected(null); localStorage.removeItem("buja_current_v8"); };
  const addContact = async () => { if(!newName||!newNumber) return; await loadUsers(); const found=users.find(u=>normalize(u.number)===normalize(newNumber)); if(cleanedContacts.some(c=>normalize(c.number)===normalize(newNumber))) return alert("Déjà ajouté"); const c: Contact={id:Date.now().toString(), name:newName, number:newNumber, online:found?.online||false, exists:!!found}; setContacts([c, ...contacts]); setShowAdd(false); setNewName(""); setNewNumber(""); };
  const addStatus = async () => { if(!statusText.trim()||!currentUser||!supabase) return; await supabase.from("statuses").insert([{user_number:currentUser.number, user_name:currentUser.name, text:statusText}]); setStatusText(""); setShowStatusAdd(false); loadStatuses(); };
  const sendText = async () => { if(!inputText.trim()||!selected||!currentUser||!supabase) return; await supabase.from("messages").insert([{from_number:currentUser.number, to_number:selected.number, text: replyTo ? `↩️ ${replyTo.text?.slice(0,30) || "vocal"}\n${inputText}` : inputText, is_read:false}]); setInputText(""); setReplyTo(null); loadMessages(); };
  const createCall = async (type: "vocal" | "video") => { if(!selected || !currentUser || !supabase) return; await supabase.from("calls").insert([{from_number:currentUser.number, to_number:selected.number, to_name:selected.name, type, status:"sortant"}]); loadCalls(); };
  const deleteMessage = async () => { if(!selectedMsg || !supabase) return; await supabase.from("messages").delete().eq("id", selectedMsg.id); setMessages(prev=>prev.filter(m=>m.id!==selectedMsg.id)); setSelectedMsg(null); };
  const downloadAudio = () => { if(!selectedMsg?.audio_url) return; const a=document.createElement("a"); a.href=selectedMsg.audio_url; a.download=`vocal-${selectedMsg.id}.webm`; a.click(); setSelectedMsg(null); };
  const markImportant = async () => { if(!selectedMsg || !supabase) return; const newVal = !selectedMsg.is_important; await supabase.from("messages").update({is_important: newVal}).eq("id", selectedMsg.id); setMessages(prev=>prev.map(m=>m.id===selectedMsg.id ? {...m, is_important: newVal} : m)); setSelectedMsg(null); };
  const forwardMessage = async (toContact: Contact) => { if(!showForward || !currentUser || !supabase) return; await supabase.from("messages").insert([{from_number:currentUser.number, to_number:toContact.number, text:showForward.text, audio_url:showForward.audio_url, is_read:false}]); setShowForward(null); setSelectedMsg(null); loadMessages(); };

  const getSupportedMime = () => { const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]; for(const t of types){ try{ if((MediaRecorder as any).isTypeSupported(t)) return t; }catch{} } return ""; };
  const blobToBase64 = (blob: Blob): Promise<string> => new Promise((res)=>{ const r=new FileReader(); r.onloadend=()=>res(r.result as string); r.readAsDataURL(blob); });
  const startRecording = async () => { if(isRecording){ stopRecording(); return; } try{ const stream = await navigator.mediaDevices.getUserMedia({audio:true}); streamRef.current=stream; const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); const source = audioCtx.createMediaStreamSource(stream); const analyser = audioCtx.createAnalyser(); analyser.fftSize=128; source.connect(analyser); const updateWave = () => { const arr=new Uint8Array(analyser.frequencyBinCount); analyser.getByteFrequencyData(arr); const newWave=Array.from({length:20},(_,i)=>{ const v=arr[i*2]||0; return Math.max(4, Math.min(28, v/5)); }); setWave(newWave); animRef.current=requestAnimationFrame(updateWave); }; updateWave(); const mime = getSupportedMime(); const mr = mime ? new MediaRecorder(stream, {mimeType:mime}) : new MediaRecorder(stream); mediaRecorderRef.current=mr; chunksRef.current=[]; mr.ondataavailable=e=>{ if(e.data.size>0) chunksRef.current.push(e.data); }; mr.onstop=async ()=>{ cancelAnimationFrame(animRef.current); const blob = new Blob(chunksRef.current, {type: mr.mimeType || "audio/webm"}); if(blob.size < 800){ stream.getTracks().forEach(t=>t.stop()); return; } const base64 = await blobToBase64(blob); if(base64.length > 900000){ alert("Vocal trop long"); stream.getTracks().forEach(t=>t.stop()); return; } if(selected && currentUser && supabase){ await supabase.from("messages").insert([{from_number:currentUser.number, to_number:selected.number, text:"🎤", audio_url:base64, is_read:false}]); loadMessages(); } stream.getTracks().forEach(t=>t.stop()); audioCtx.close(); setWave(Array(20).fill(8)); }; mr.start(100); setIsRecording(true); setRecTime(0); timerRef.current=setInterval(()=>setRecTime(s=>s+1),1000); }catch{ alert("Micro bloqué"); } };
  const stopRecording = () => { if(mediaRecorderRef.current && isRecording){ mediaRecorderRef.current.stop(); setIsRecording(false); clearInterval(timerRef.current); cancelAnimationFrame(animRef.current); if(streamRef.current) streamRef.current.getTracks().forEach(t=>t.stop()); } };
  const cancelRecording = () => { if(mediaRecorderRef.current){ mediaRecorderRef.current.onstop=null; mediaRecorderRef.current.stop(); } setIsRecording(false); clearInterval(timerRef.current); cancelAnimationFrame(animRef.current); if(streamRef.current) streamRef.current.getTracks().forEach(t=>t.stop()); setWave(Array(20).fill(8)); };

  const chatMessages = messages.filter(m=> selected && ((normalize(m.from_number)===normalize(currentUser!.number) && normalize(m.to_number)===normalize(selected.number)) || (normalize(m.from_number)===normalize(selected.number) && normalize(m.to_number)===normalize(currentUser!.number))));

  if(!currentUser){
    return (
      <div style={{height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f0f2f5", padding:16}}>
        <div style={{background:"white", padding:28, borderRadius:20, width:"100%", maxWidth:380}}>
          <div style={{textAlign:"center", marginBottom:20}}><div style={{width:60, height:60, background:"#25D366", borderRadius:16, display:"inline-flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800, fontSize:28}}>B</div><h2 style={{margin:"10px 0 4px"}}>Buja Connect</h2></div>
          {authMode==="signup" && <input value={aName} onChange={e=>setAName(e.target.value)} placeholder="Ton nom" style={{width:"100%", padding:16, marginBottom:12, borderRadius:12, border:"2px solid #e9edef", fontSize:16}}/>}
          <input value={aNumber} onChange={e=>setANumber(e.target.value)} placeholder="Numéro" style={{width:"100%", padding:16, marginBottom:12, borderRadius:12, border:"2px solid #25D366", background:"#f6fff8", fontSize:16, fontWeight:600}}/>
          <input type="password" value={aPass} onChange={e=>setAPass(e.target.value)} placeholder="Mot de passe" style={{width:"100%", padding:16, marginBottom:16, borderRadius:12, border:"2px solid #e9edef", fontSize:16}}/>
          <button onClick={authMode==="login"?handleLogin:handleSignup} style={{width:"100%", padding:16, background:"#25D366", color:"white", border:"none", borderRadius:12, fontWeight:800, fontSize:16}}>{authMode==="login"?"Se connecter":"Créer compte"}</button>
          <p style={{textAlign:"center", fontSize:14, marginTop:16, color:"#008069", fontWeight:700}} onClick={()=>setAuthMode(authMode==="login"?"signup":"login")}>{authMode==="login"?"Pas de compte ? S'inscrire →":"Déjà un compte ?"}</p>
        </div>
      </div>
    );
  }

  const showChatOnMobile = !!selected;

  return (
    <div style={{display:"flex", height:"100vh", width:"100vw", fontFamily:"-apple-system, sans-serif", background:"#fff", overflow:"hidden"}}>
      <div style={{width:"100%", maxWidth:450, background:"white", display: showChatOnMobile ? "none" : "flex", flexDirection:"column"}}>
        <div style={{height:60, background:"#008069", color:"white", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px"}}><b style={{fontSize:20}}>Buja Connect</b><div style={{display:"flex", gap:16}}><span onClick={()=>setShowAdd(true)} style={{fontSize:22, cursor:"pointer"}}>＋</span><span onClick={logout} style={{fontSize:12, border:"1px solid white", padding:"4px 8px", borderRadius:12}}>Déco</span></div></div>
        {tab==="disc" && (<><div style={{padding:8, background:"#f0f2f5"}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher" style={{width:"100%", background:"white", border:"none", borderRadius:20, padding:"10px 16px", fontSize:15}}/></div><div style={{flex:1, overflowY:"auto"}}>{cleanedContacts.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())).map(c=>{ const lastMsg = [...messages].reverse().find(m=> normalize(m.from_number)===normalize(c.number) || normalize(m.to_number)===normalize(c.number)); return (<div key={c.id} onClick={()=>setSelected(c)} style={{display:"flex", gap:12, padding:"12px 16px", cursor:"pointer"}}><div style={{width:50, height:50, borderRadius:"50%", background:c.exists?"#d9fdd3":"#e9edef", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700}}>{c.name[0].toUpperCase()}</div><div style={{flex:1, borderBottom:"1px solid #f2f2f2", paddingBottom:12}}><div style={{display:"flex", justifyContent:"space-between"}}><b>{c.name}</b><span style={{fontSize:11, color:"#667781"}}>{lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}) : ""}</span></div><div style={{fontSize:13, color:c.exists?"#008069":"#e11", fontWeight:700}}>{c.number} • {c.exists?"Sur Buja":"Pas sur Buja"}</div><div style={{fontSize:14, color:"#667781", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:220}}>{lastMsg?.audio_url ? "🎤 Vocal" : lastMsg?.text || ""}</div></div></div>); })}</div></>)}
        {tab==="actu" && <div style={{flex:1, overflowY:"auto"}}><div style={{padding:16, display:"flex", gap:12, cursor:"pointer"}} onClick={()=>setShowStatusAdd(true)}><div style={{width:52, height:52, borderRadius:"50%", background:"#f0f2f5", border:"2px dashed #25D366", display:"flex", alignItems:"center", justifyContent:"center"}}>+</div><div><b>Mon statut</b></div></div>{statuses.map(s=><div key={s.id} style={{display:"flex", gap:12, padding:"12px 16px"}}><div style={{width:50, height:50, borderRadius:"50%", border:"3px solid #25D366", display:"flex", alignItems:"center", justifyContent:"center"}}>{s.user_name[0]}</div><div><b>{s.user_name}</b><div style={{fontSize:13}}>{s.text}</div></div></div>)}</div>}
        {tab==="comm" && <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center"}}>Communautés bientôt</div>}
        {tab==="appels" && <div style={{flex:1, overflowY:"auto"}}>{calls.length===0 ? <div style={{textAlign:"center", marginTop:60, color:"#888"}}>Aucun appel</div> : calls.map(call=><div key={call.id} style={{display:"flex", gap:12, padding:"12px 16px"}}><div style={{width:48, height:48, borderRadius:"50%", background:"#f0f2f5", display:"flex", alignItems:"center", justifyContent:"center"}}>{call.type==="video"?"📹":"📞"}</div><div style={{flex:1}}><b>{call.to_name}</b><div style={{fontSize:12}}>{call.status} • {new Date(call.created_at).toLocaleString()}</div></div></div>)}</div>}
        <div style={{height:70, borderTop:"1px solid #e9edef", display:"flex", background:"white"}}>{[{id:"disc", label:"Disc.", icon:"💬"},{id:"actu", label:"Actus", icon:"⭕"},{id:"comm", label:"Commu.", icon:"👥"},{id:"appels", label:"Appels", icon:"📞"}].map(t=>(<div key={t.id} onClick={()=>setTab(t.id as any)} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:tab===t.id?"#008069":"#667781", cursor:"pointer"}}><span style={{fontSize:22}}>{t.icon}</span><span style={{fontSize:11, fontWeight:tab===t.id?700:400}}>{t.label}</span></div>))}</div>
      </div>

      {selected && (
        <div style={{flex:1, background:"#efeae2", display:"flex", flexDirection:"column", width:"100%"}}>
          <div style={{height:60, background:"#008069", color:"white", display:"flex", alignItems:"center", padding:"0 12px", gap:10}}>
            <span onClick={()=>setSelected(null)} style={{fontSize:22, cursor:"pointer"}}>←</span>
            <div onClick={()=>setShowContactInfo(true)} style={{display:"flex", alignItems:"center", gap:10, flex:1, cursor:"pointer"}}>
              <div style={{width:40, height:40, borderRadius:"50%", background:"white", color:"#008069", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700}}>{selected.name[0]}</div>
              <div><b>{selected.name}</b><div style={{fontSize:12, opacity:0.9}}>{selected.number}</div></div>
            </div>
            <span onClick={()=>createCall("vocal")} style={{fontSize:20, cursor:"pointer", padding:6}}>📞</span>
            <span onClick={()=>createCall("video")} style={{fontSize:20, cursor:"pointer", padding:6}}>📹</span>
          </div>
          {replyTo && <div style={{background:"#fff8c4", padding:"8px 12px", display:"flex", justifyContent:"space-between", borderLeft:"4px solid #008069"}}><div><b style={{fontSize:12, color:"#008069"}}>Réponse à</b><div style={{fontSize:13}}>{replyTo.text?.slice(0,50) || "🎤 Vocal"}</div></div><span onClick={()=>setReplyTo(null)} style={{cursor:"pointer"}}>✕</span></div>}
          <div style={{flex:1, padding:12, overflowY:"auto", display:"flex", flexDirection:"column", gap:8}}>
            {chatMessages.map(m=>{
              const isMe = normalize(m.from_number)===normalize(currentUser.number);
              const isRead = m.is_read;
              return (
                <div key={m.id} style={{alignSelf:isMe?"flex-end":"flex-start", background:isMe?"#d9fdd3":"white", padding:"8px 8px 8px 12px", borderRadius:isMe?"8px 0 8px 8px":"0 8px 8px 8px", maxWidth:"85%", boxShadow:"0 1px 0.5px rgba(0,0,0,0.13)", display:"flex", alignItems:"flex-start", gap:6, borderLeft: m.is_important ? "4px solid #FFC107" : "none"}}>
                  <div style={{flex:1}}>
                    {m.audio_url ? <div style={{display:"flex", alignItems:"center", gap:8, minWidth:200}}><audio controls preload="metadata" playsInline style={{width:180, height:36}} src={m.audio_url} /></div> : <span style={{fontSize:15, color:"#111b21", whiteSpace:"pre-wrap"}}>{m.text}</span>}
                    <div style={{fontSize:10, color: isMe && isRead ? "#53bdeb" : "#667781", textAlign:"right", marginTop:4, fontWeight: isMe && isRead ? 800 : 400}}>{new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})} {isMe && <span style={{color: isRead ? "#53bdeb" : "#667781"}}>{isRead ? "✓✓" : "✓✓"}</span>} {m.is_important ? "⭐" : ""}</div>
                  </div>
                  <span onClick={()=>setSelectedMsg(m)} style={{cursor:"pointer", padding:"2px 6px", fontSize:18, color:"#667781", background:"#00000008", borderRadius:8}}>⋮</span>
                </div>
              );
            })}
            <div ref={endRef}/>
          </div>
          {isRecording ? (
            <div style={{height:62, background:"white", display:"flex", alignItems:"center", padding:"0 12px", gap:10, borderTop:"1px solid #e9edef"}}>
              <button onClick={cancelRecording} style={{width:40, height:40, borderRadius:"50%", background:"#f0f2f5", border:"none", fontSize:18}}>🗑️</button>
              <div style={{display:"flex", alignItems:"center", gap:2, flex:1}}><span style={{width:10, height:10, background:"#f44336", borderRadius:"50%"}}></span><span style={{fontSize:14, color:"#f44336", fontWeight:700, marginLeft:6}}>{String(Math.floor(recTime/60)).padStart(2,"0")}:{String(recTime%60).padStart(2,"0")}</span><div style={{display:"flex", alignItems:"center", gap:2, marginLeft:12, flex:1}}>{wave.map((h,i)=>(<div key={i} style={{width:3, height:`${h}px`, background: h>15 ? "#008069" : "#25D366", borderRadius:2}}/>))}</div></div>
              <button onClick={stopRecording} style={{width:50, height:50, borderRadius:"50%", background:"#008069", color:"white", border:"none", fontSize:20}}>▶</button>
            </div>
          ) : (
            <div style={{minHeight:62, background:"white", display:"flex", alignItems:"center", padding:"6px 8px", gap:8, borderTop:"1px solid #e9edef"}}>
              <div style={{flex:1, background:"#f0f2f5", borderRadius:24, display:"flex", alignItems:"center", padding:"0 12px", minHeight:46}}><input value={inputText} onChange={e=>setInputText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendText()} placeholder="Message" style={{flex:1, border:"none", outline:"none", fontSize:16, background:"transparent", padding:"10px 0", color:"#111b21"}}/></div>
              {inputText.trim() ? <button onClick={sendText} style={{width:48, height:48, borderRadius:"50%", background:"#008069", color:"white", border:"none", fontSize:20}}>➤</button> : <button onClick={startRecording} style={{width:48, height:48, borderRadius:"50%", background:"#008069", color:"white", border:"none", fontSize:20}}>🎤</button>}
            </div>
          )}
        </div>
      )}

      {selectedMsg && (
        <div style={{position:"fixed", inset:0, background:"transparent", zIndex:300}} onClick={()=>setSelectedMsg(null)}>
          <div onClick={e=>e.stopPropagation()} style={{position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"white", borderRadius:12, width:280, boxShadow:"0 8px 24px rgba(0,0,0,0.25)", overflow:"hidden", border:"1px solid #e9edef"}}>
            <div style={{padding:"8px 0"}}>
              <div onClick={()=>{ alert(`Infos du message\n\nDe: ${selectedMsg.from_number}\nA: ${selectedMsg.to_number}\nHeure: ${new Date(selectedMsg.created_at).toLocaleString()}\nLu: ${selectedMsg.is_read ? "Oui - bleu" : "Non - gris"}\nImportant: ${selectedMsg.is_important ? "Oui" : "Non"}`); setSelectedMsg(null); }} style={{padding:"12px 16px", display:"flex", alignItems:"center", gap:16, cursor:"pointer"}}>
                <span style={{width:20, textAlign:"center", color:"#667781"}}>ⓘ</span><span style={{fontSize:14, color:"#111b21"}}>Infos du message</span>
              </div>
              <div onClick={()=>{ setReplyTo(selectedMsg); setSelectedMsg(null); }} style={{padding:"12px 16px", display:"flex", alignItems:"center", gap:16, cursor:"pointer"}}>
                <span style={{width:20, textAlign:"center", color:"#667781"}}>↩</span><span style={{fontSize:14, color:"#111b21"}}>Répondre</span>
              </div>
              <div onClick={()=>{ setShowReaction(selectedMsg); setSelectedMsg(null); }} style={{padding:"12px 16px", display:"flex", alignItems:"center", gap:16, cursor:"pointer"}}>
                <span style={{width:20, textAlign:"center", color:"#667781"}}>☺</span><span style={{fontSize:14, color:"#111b21"}}>Réagir</span>
              </div>
              {selectedMsg.audio_url && (
                <div onClick={downloadAudio} style={{padding:"12px 16px", display:"flex", alignItems:"center", gap:16, cursor:"pointer"}}>
                  <span style={{width:20, textAlign:"center", color:"#667781"}}>⬇</span><span style={{fontSize:14, color:"#111b21"}}>Télécharger</span>
                </div>
              )}
              <div onClick={()=>{ setShowForward(selectedMsg); setSelectedMsg(null); }} style={{padding:"12px 16px", display:"flex", alignItems:"center", gap:16, cursor:"pointer"}}>
                <span style={{width:20, textAlign:"center", color:"#667781"}}>↗</span><span style={{fontSize:14, color:"#111b21"}}>Transférer</span>
              </div>
              <div onClick={markImportant} style={{padding:"12px 16px", display:"flex", alignItems:"center", gap:16, cursor:"pointer"}}>
                <span style={{width:20, textAlign:"center", color:"#667781"}}>☆</span><span style={{fontSize:14, color:"#111b21"}}>{selectedMsg.is_important ? "Retirer important" : "Marquer comme important"}</span>
              </div>
              <div onClick={deleteMessage} style={{padding:"12px 16px", display:"flex", alignItems:"center", gap:16, cursor:"pointer"}}>
                <span style={{width:20, textAlign:"center", color:"#667781"}}>🗑</span><span style={{fontSize:14, color:"#f15c6d"}}>Supprimer</span>
              </div>
            </div>
            <div style={{height:1, background:"#e9edef"}}></div>
            <div style={{padding:"8px 16px", fontSize:11, color:"#667781", textAlign:"center"}}>{new Date(selectedMsg.created_at).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</div>
          </div>
        </div>
      )}

      {showReaction && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:400}}>
          <div style={{background:"white", borderRadius:24, padding:12, display:"flex", gap:8, boxShadow:"0 8px 24px rgba(0,0,0,0.2)"}}>
            {["❤️","😂","😮","😢","🙏","👍"].map(emoji=>(<span key={emoji} onClick={()=>{ alert(`Tu as réagi ${emoji}`); setShowReaction(null); }} style={{fontSize:28, cursor:"pointer", padding:6}}>{emoji}</span>))}
            <span onClick={()=>setShowReaction(null)} style={{fontSize:20, padding:6, cursor:"pointer"}}>✕</span>
          </div>
        </div>
      )}

      {showForward && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:401}}>
          <div style={{background:"white", width:"100%", maxWidth:450, borderRadius:"20px 20px 0 0", maxHeight:"70vh", display:"flex", flexDirection:"column"}}>
            <div style={{padding:16, borderBottom:"1px solid #e9edef", display:"flex", justifyContent:"space-between"}}><b>Transférer à</b><span onClick={()=>setShowForward(null)} style={{cursor:"pointer"}}>✕</span></div>
            <div style={{flex:1, overflowY:"auto"}}>{cleanedContacts.map(c=>(<div key={c.id} onClick={()=>forwardMessage(c)} style={{display:"flex", gap:12, padding:"12px 16px", cursor:"pointer", borderBottom:"1px solid #f5f5f5"}}><div style={{width:48, height:48, borderRadius:"50%", background:"#d9fdd3", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700}}>{c.name[0]}</div><div><b>{c.name}</b><div style={{fontSize:12, color:"#667781"}}>{c.number}</div></div></div>))}</div>
          </div>
        </div>
      )}

      {showContactInfo && selected && (
        <div style={{position:"fixed", inset:0, background:"white", zIndex:150, display:"flex", flexDirection:"column"}}>
          <div style={{height:60, background:"#008069", color:"white", display:"flex", alignItems:"center", padding:"0 16px", gap:12}}><span onClick={()=>setShowContactInfo(false)} style={{fontSize:22, cursor:"pointer"}}>←</span><b>Infos contact</b></div>
          <div style={{flex:1, overflowY:"auto", padding:24, textAlign:"center"}}>
            <div style={{width:100, height:100, borderRadius:"50%", background:"#d9fdd3", display:"flex", alignItems:"center", justifyContent:"center", fontSize:40, fontWeight:700, margin:"0 auto"}}>{selected.name[0]}</div>
            <h2>{selected.name}</h2><p style={{color:"#667781"}}>{selected.number}</p>
          </div>
        </div>
      )}

      {showAdd && (<div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:99}}><div style={{background:"white", width:"100%", maxWidth:450, borderRadius:"20px 20px 0 0", padding:24}}><h3>Nouveau contact</h3><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nom ex: YVES" style={{width:"100%", padding:16, marginBottom:12, borderRadius:12, border:"2px solid #e9edef", fontSize:16}}/><input value={newNumber} onChange={e=>setNewNumber(e.target.value)} placeholder="Numéro" style={{width:"100%", padding:16, marginBottom:16, borderRadius:12, border:"2px solid #25D366", background:"#f6fff8", fontSize:16}}/><div style={{display:"flex", gap:10}}><button onClick={()=>setShowAdd(false)} style={{flex:1, padding:14, borderRadius:12, border:"1px solid #ddd", background:"white"}}>Annuler</button><button onClick={addContact} style={{flex:1, padding:14, borderRadius:12, background:"#008069", color:"white", border:"none", fontWeight:700}}>Ajouter</button></div></div></div>)}
      {showStatusAdd && (<div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:99}}><div style={{background:"white", padding:24, borderRadius:16, width:"90%", maxWidth:340}}><h3>Nouveau statut</h3><textarea value={statusText} onChange={e=>setStatusText(e.target.value)} placeholder="Quoi de neuf ?" style={{width:"100%", height:100, padding:12, borderRadius:12, border:"2px solid #e9edef", fontSize:16}}/><div style={{display:"flex", gap:10, marginTop:12}}><button onClick={()=>setShowStatusAdd(false)} style={{flex:1, padding:12, borderRadius:12, border:"1px solid #ddd", background:"white"}}>Annuler</button><button onClick={addStatus} style={{flex:1, padding:12, borderRadius:12, background:"#008069", color:"white", border:"none"}}>Publier</button></div></div></div>)}
    </div>
  );
}
