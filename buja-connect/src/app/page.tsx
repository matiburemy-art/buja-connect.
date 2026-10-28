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
  const [isRecording, setIsRecording] = useState(false); const [recTime, setRecTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); const chunksRef = useRef<Blob[]>([]); const timerRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadUsers = async () => { if(!supabase){ const u=localStorage.getItem("buja_users_backup"); if(u) setUsers(JSON.parse(u)); return;} const {data}=await supabase.from("users").select("*"); if(data) setUsers(data as any); };
  const loadStatuses = async () => { if(!supabase) return; const {data}=await supabase.from("statuses").select("*").order("created_at",{ascending:false}); if(data) setStatuses(data); };
  const loadMessages = async () => {
    if(!supabase || !currentUser) return;
    const {data}=await supabase.from("messages").select("*").or(`from_number.eq.${currentUser.number},to_number.eq.${currentUser.number}`).order("created_at",{ascending:true});
    if(data) setMessages(data);
  };

  useEffect(()=>{ loadUsers(); loadStatuses(); const c=localStorage.getItem("buja_contacts_v8"); if(c) setContacts(JSON.parse(c)); const cu=localStorage.getItem("buja_current_v8"); if(cu) setCurrentUser(JSON.parse(cu)); },[]);
  useEffect(()=>{ localStorage.setItem("buja_contacts_v8", JSON.stringify(contacts)); },[contacts]);
  useEffect(()=>{ if(currentUser) loadMessages(); const i=setInterval(()=>{ if(currentUser){ loadMessages(); loadUsers(); }},2500); return()=>clearInterval(i); },[currentUser, selected]);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages, selected]);

  // Marquer comme lu quand Yves ouvre le chat
  useEffect(()=>{
    if(!supabase || !selected || !currentUser) return;
    const unread = messages.filter(m=> normalize(m.from_number)===normalize(selected.number) && normalize(m.to_number)===normalize(currentUser.number) && !m.is_read);
    if(unread.length>0){
      supabase.from("messages").update({is_read:true}).in("id", unread.map(u=>u.id)).then(()=>loadMessages());
    }
  },[selected, messages]);

  const cleanedContacts = contacts.filter((c,i,arr)=> i===arr.findIndex(x=>normalize(x.number)===normalize(c.number)));

  const handleSignup = async () => {
    if(!aName||!aNumber||!aPass) return alert("Remplis tout");
    if(!supabase){ const nu={name:aName, number:aNumber, password:aPass, online:true}; const all=[...users, nu]; setUsers(all); localStorage.setItem("buja_users_backup", JSON.stringify(all)); setCurrentUser(nu); localStorage.setItem("buja_current_v8", JSON.stringify(nu)); return;}
    const {error}=await supabase.from("users").insert([{name:aName, number:aNumber, password:aPass, online:true}]); if(error) return alert("Numéro déjà utilisé");
    const nu={name:aName, number:aNumber, password:aPass, online:true}; setCurrentUser(nu); localStorage.setItem("buja_current_v8", JSON.stringify(nu)); loadUsers();
  };
  const handleLogin = async () => {
    if(!supabase){ const f=users.find(u=>normalize(u.number)===normalize(aNumber) && u.password===aPass); if(!f) return alert("Faux"); setCurrentUser(f); localStorage.setItem("buja_current_v8", JSON.stringify(f)); return;}
    const {data}=await supabase.from("users").select("*").eq("number", aNumber).eq("password", aPass).single(); if(!data) return alert("Faux"); await supabase.from("users").update({online:true}).eq("number", aNumber); setCurrentUser(data as any); localStorage.setItem("buja_current_v8", JSON.stringify(data));
  };
  const logout = async () => { if(supabase && currentUser) await supabase.from("users").update({online:false}).eq("number", currentUser.number); setCurrentUser(null); setSelected(null); localStorage.removeItem("buja_current_v8"); };

  const addContact = async () => {
    if(!newName||!newNumber) return; await loadUsers();
    const found=users.find(u=>normalize(u.number)===normalize(newNumber)); if(cleanedContacts.some(c=>normalize(c.number)===normalize(newNumber))) return alert("Déjà ajouté");
    const c: Contact={id:Date.now().toString(), name:newName, number:newNumber, online:found?.online||false, exists:!!found};
    setContacts([c, ...contacts]); setShowAdd(false); setNewName(""); setNewNumber("");
  };
  const addStatus = async () => { if(!statusText.trim()||!currentUser||!supabase) return; await supabase.from("statuses").insert([{user_number:currentUser.number, user_name:currentUser.name, text:statusText}]); setStatusText(""); setShowStatusAdd(false); loadStatuses(); };

  const sendText = async () => {
    if(!inputText.trim()||!selected||!currentUser||!supabase) return;
    await supabase.from("messages").insert([{from_number:currentUser.number, to_number:selected.number, text:inputText, is_read:false}]);
    setInputText(""); loadMessages();
  };

  // AUDIO
  const startRecording = async () => {
    try{
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const mr = new MediaRecorder(stream); mediaRecorderRef.current=mr; chunksRef.current=[];
      mr.ondataavailable=e=>{ if(e.data.size>0) chunksRef.current.push(e.data); };
      mr.onstop=async ()=>{
        const blob = new Blob(chunksRef.current, {type:"audio/webm"});
        // Upload vers Supabase Storage si bucket existe, sinon base64 local
        let audioUrl = "";
        if(supabase){
          try{
            const fileName = `${Date.now()}.webm`;
            const {error} = await supabase.storage.from("audios").upload(fileName, blob);
            if(!error){ const {data}=supabase.storage.from("audios").getPublicUrl(fileName); audioUrl=data.publicUrl; }
          }catch{}
        }
        if(!audioUrl){ audioUrl = URL.createObjectURL(blob); } // fallback local
        if(selected && currentUser && supabase){
          await supabase.from("messages").insert([{from_number:currentUser.number, to_number:selected.number, text:"🎤 Message vocal", audio_url:audioUrl, is_read:false}]);
          loadMessages();
        }
        stream.getTracks().forEach(t=>t.stop());
      };
      mr.start(); setIsRecording(true); setRecTime(0);
      timerRef.current=setInterval(()=>setRecTime(s=>s+1),1000);
    }catch{ alert("Micro non autorisé"); }
  };
  const stopRecording = () => {
    if(mediaRecorderRef.current && isRecording){ mediaRecorderRef.current.stop(); setIsRecording(false); clearInterval(timerRef.current); }
  };

  const chatMessages = messages.filter(m=> selected && ((normalize(m.from_number)===normalize(currentUser!.number) && normalize(m.to_number)===normalize(selected.number)) || (normalize(m.from_number)===normalize(selected.number) && normalize(m.to_number)===normalize(currentUser!.number))));

  if(!currentUser){
    return (
      <div style={{height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#e5ddd5", padding:16}}>
        <div style={{background:"white", padding:28, borderRadius:20, width:"100%", maxWidth:380, boxShadow:"0 4px 20px rgba(0,0,0,0.15)"}}>
          <div style={{textAlign:"center", marginBottom:20}}><div style={{width:60, height:60, background:"#25D366", borderRadius:16, display:"inline-flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800, fontSize:28}}>B</div><h2 style={{margin:"10px 0 4px", color:"#111b21"}}>Buja Connect</h2><p style={{fontSize:13, color:"#667781"}}>Connecte-toi pour parler à YVES</p></div>
          {authMode==="signup" && <input value={aName} onChange={e=>setAName(e.target.value)} placeholder="Ton nom ex: REMY" style={{width:"100%", padding:16, marginBottom:12, borderRadius:12, border:"2px solid #e9edef", background:"white", color:"#111b21", fontSize:16, outline:"none"}}/>}
          <input value={aNumber} onChange={e=>setANumber(e.target.value)} placeholder="Ton numéro ex: 66465801" style={{width:"100%", padding:16, marginBottom:12, borderRadius:12, border:"2px solid #25D366", background:"#f6fff8", color:"#111b21", fontSize:16, fontWeight:600, outline:"none"}}/>
          <input type="password" value={aPass} onChange={e=>setAPass(e.target.value)} placeholder="Mot de passe" style={{width:"100%", padding:16, marginBottom:16, borderRadius:12, border:"2px solid #e9edef", background:"white", color:"#111b21", fontSize:16, outline:"none"}}/>
          <button onClick={authMode==="login"?handleLogin:handleSignup} style={{width:"100%", padding:16, background:"#25D366", color:"white", border:"none", borderRadius:12, fontWeight:800, fontSize:16}}>{authMode==="login"?"Se connecter":"Créer compte"}</button>
          <p style={{textAlign:"center", fontSize:14, marginTop:16, color:"#008069", fontWeight:700, cursor:"pointer"}} onClick={()=>setAuthMode(authMode==="login"?"signup":"login")}>{authMode==="login"?"Pas de compte ? S'inscrire →":"Déjà un compte ? Se connecter →"}</p>
        </div>
      </div>
    );
  }

  const showChatOnMobile = !!selected;

  return (
    <div style={{display:"flex", height:"100vh", width:"100vw", fontFamily:"-apple-system, sans-serif", background:"#fff", overflow:"hidden"}}>
      <div style={{width:"100%", maxWidth:450, background:"white", display: showChatOnMobile ? "none" : "flex", flexDirection:"column"}}>
        <div style={{height:60, background:"#008069", color:"white", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px"}}>
          <b style={{fontSize:20}}>Buja Connect</b><div style={{display:"flex", gap:16}}><span onClick={()=>setShowAdd(true)} style={{fontSize:22, cursor:"pointer"}}>＋</span><span onClick={logout} style={{fontSize:12, border:"1px solid white", padding:"4px 8px", borderRadius:12, cursor:"pointer"}}>Déco</span></div>
        </div>
        {tab==="disc" && (
          <>
            <div style={{padding:8, background:"#f0f2f5"}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher YVES..." style={{width:"100%", background:"white", border:"none", borderRadius:20, padding:"10px 16px", fontSize:15}}/></div>
            <div style={{flex:1, overflowY:"auto"}}>
              {cleanedContacts.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())).map(c=>{
                const lastMsg = [...messages].reverse().find(m=> normalize(m.from_number)===normalize(c.number) || normalize(m.to_number)===normalize(c.number));
                return (<div key={c.id} onClick={()=>setSelected(c)} style={{display:"flex", gap:12, padding:"12px 16px"}}><div style={{width:50, height:50, borderRadius:"50%", background:c.exists?"#d9fdd3":"#e9edef", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700}}>{c.name[0].toUpperCase()}</div><div style={{flex:1, borderBottom:"1px solid #f2f2f2", paddingBottom:12}}><div style={{display:"flex", justifyContent:"space-between"}}><b style={{fontSize:16}}>{c.name}</b><span style={{fontSize:11, color:"#667781"}}>{lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}) : ""}</span></div><div style={{fontSize:13, color:c.exists?"#008069":"#e11", fontWeight:700}}>{c.number} • {c.exists?"Sur Buja":"Pas sur Buja"}</div><div style={{fontSize:14, color:"#667781", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:220}}>{lastMsg?.text || ""}</div></div></div>);
              })}
              {cleanedContacts.length===0 && <div style={{textAlign:"center", marginTop:80}}><button onClick={()=>setShowAdd(true)} style={{background:"#25D366", color:"white", border:"none", padding:"12px 24px", borderRadius:24, fontWeight:700}}>＋ Ajouter YVES</button></div>}
            </div>
          </>
        )}
        {tab==="actu" && <div style={{flex:1, overflowY:"auto"}}><div style={{padding:16, display:"flex", gap:12}} onClick={()=>setShowStatusAdd(true)}><div style={{width:52, height:52, borderRadius:"50%", background:"#f0f2f5", border:"2px dashed #25D366", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22}}>+</div><div><b>Mon statut</b><div style={{fontSize:13, color:"#667781"}}>Ajouter</div></div></div><div style={{background:"#f0f2f5", padding:"8px 16px", fontSize:12, fontWeight:700, color:"#667781"}}>RÉCENTS</div>{statuses.map(s=><div key={s.id} style={{display:"flex", gap:12, padding:"12px 16px"}}><div style={{width:50, height:50, borderRadius:"50%", border:"3px solid #25D366", display:"flex", alignItems:"center", justifyContent:"center"}}>{s.user_name[0]}</div><div><b>{s.user_name}</b><div style={{fontSize:13, color:"#667781"}}>{s.text}</div></div></div>)}</div>}
        {tab==="comm" && <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center"}}>Bientôt</div>}
        {tab==="appels" && <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#888"}}>Aucun appel</div>}
        <div style={{height:70, borderTop:"1px solid #e9edef", display:"flex", background:"white"}}>
          {[{id:"disc", label:"Disc.", icon:"💬"},{id:"actu", label:"Actus", icon:"⭕"},{id:"comm", label:"Commu.", icon:"👥"},{id:"appels", label:"Appels", icon:"📞"}].map(t=>(
            <div key={t.id} onClick={()=>setTab(t.id as any)} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:tab===t.id?"#008069":"#667781", cursor:"pointer"}}><span style={{fontSize:22}}>{t.icon}</span><span style={{fontSize:11, fontWeight:tab===t.id?700:400}}>{t.label}</span></div>
          ))}
        </div>
      </div>

      {selected && (
        <div style={{flex:1, background:"#efeae2", display:"flex", flexDirection:"column", width:"100%"}}>
          <div style={{height:60, background:"#008069", color:"white", display:"flex", alignItems:"center", padding:"0 12px", gap:10}}>
            <span onClick={()=>setSelected(null)} style={{fontSize:22, cursor:"pointer"}}>←</span>
            <div style={{width:40, height:40, borderRadius:"50%", background:"white", color:"#008069", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700}}>{selected.name[0]}</div>
            <div style={{flex:1}}><b>{selected.name}</b><div style={{fontSize:12, opacity:0.9}}>{selected.number} • en ligne</div></div>
          </div>
          <div style={{flex:1, padding:12, overflowY:"auto", display:"flex", flexDirection:"column", gap:6}}>
            {chatMessages.map(m=>{
              const isMe = normalize(m.from_number)===normalize(currentUser.number);
              const isRead = m.is_read;
              return (
                <div key={m.id} style={{alignSelf:isMe?"flex-end":"flex-start", background:isMe?"#d9fdd3":"white", padding:"8px 12px", borderRadius:isMe?"8px 0 8px 8px":"0 8px 8px 8px", maxWidth:"80%", boxShadow:"0 1px 0.5px rgba(0,0,0,0.13)"}}>
                  {m.audio_url ? (
                    <audio controls src={m.audio_url} style={{width:200}}/>
                  ) : (
                    <span style={{fontSize:15, color:"#111b21"}}>{m.text}</span>
                  )}
                  <div style={{fontSize:10, color: isMe && isRead ? "#53bdeb" : "#667781", textAlign:"right", marginTop:4, fontWeight: isMe && isRead ? 800 : 400}}>
                    {new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})} {isMe && <span style={{color: isRead ? "#53bdeb" : "#667781"}}>{isRead ? "✓✓" : "✓✓"}</span>}
                  </div>
                </div>
              );
            })}
            <div ref={endRef}/>
          </div>
          {/* BARRE MESSAGE + AUDIO */}
          <div style={{minHeight:62, background:"#f0f2f5", display:"flex", alignItems:"center", padding:"6px 8px", gap:8}}>
            <div style={{flex:1, background:"white", borderRadius:24, display:"flex", alignItems:"center", padding:"0 4px 0 12px", minHeight:46, boxShadow:"0 1px 1px rgba(0,0,0,0.08)"}}>
              <input value={inputText} onChange={e=>setInputText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendText()} placeholder="Message" style={{flex:1, border:"none", outline:"none", fontSize:16, background:"transparent", padding:"10px 0"}}/>
              <span style={{padding:"0 6px", fontSize:20}}>📎</span>
              <span style={{padding:"0 6px", fontSize:20}}>😊</span>
            </div>
            {inputText.trim() ? (
              <button onClick={sendText} style={{width:48, height:48, borderRadius:"50%", background:"#008069", color:"white", border:"none", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center"}}>➤</button>
            ) : (
              <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} style={{width:48, height:48, borderRadius:"50%", background: isRecording ? "#f44336" : "#008069", color:"white", border:"none", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s"}}>
                {isRecording ? "■" : "🎤"}
              </button>
            )}
          </div>
          {isRecording && <div style={{background:"#f44336", color:"white", textAlign:"center", padding:"4px", fontSize:12}}>● Enregistrement {recTime}s - relâche pour envoyer</div>}
        </div>
      )}

      {showAdd && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:99}}>
          <div style={{background:"white", width:"100%", maxWidth:450, borderRadius:"20px 20px 0 0", padding:24}}>
            <h3 style={{marginTop:0, color:"#111b21"}}>Nouveau contact</h3>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nom ex: YVES" style={{width:"100%", padding:16, marginBottom:12, borderRadius:12, border:"2px solid #e9edef", background:"white", fontSize:16}}/>
            <input value={newNumber} onChange={e=>setNewNumber(e.target.value)} placeholder="Numéro 66465801" style={{width:"100%", padding:16, marginBottom:16, borderRadius:12, border:"2px solid #25D366", background:"#f6fff8", fontSize:16, fontWeight:600}}/>
            <div style={{display:"flex", gap:10}}><button onClick={()=>setShowAdd(false)} style={{flex:1, padding:14, borderRadius:12, border:"1px solid #ddd", background:"white"}}>Annuler</button><button onClick={addContact} style={{flex:1, padding:14, borderRadius:12, background:"#008069", color:"white", border:"none", fontWeight:700}}>Ajouter</button></div>
          </div>
        </div>
      )}
      {showStatusAdd && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:99}}>
          <div style={{background:"white", padding:24, borderRadius:16, width:"90%", maxWidth:340}}><h3>Nouveau statut</h3><textarea value={statusText} onChange={e=>setStatusText(e.target.value)} placeholder="Quoi de neuf ?" style={{width:"100%", height:100, padding:12, borderRadius:12, border:"2px solid #e9edef", fontSize:16}}/><div style={{display:"flex", gap:10, marginTop:12}}><button onClick={()=>setShowStatusAdd(false)} style={{flex:1, padding:12, borderRadius:12, border:"1px solid #ddd", background:"white"}}>Annuler</button><button onClick={addStatus} style={{flex:1, padding:12, borderRadius:12, background:"#008069", color:"white", border:"none"}}>Publier</button></div></div>
        </div>
      )}
    </div>
  );
}
