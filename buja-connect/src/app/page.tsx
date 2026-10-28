"use client";
import { useState, useEffect, useRef } from "react";
type UserAcc = { name: string; number: string; password: string; online: boolean; };
type Msg = { id: string; text?: string; audioUrl?: string; time: string; me: boolean; status: "sent" | "delivered" | "read"; };
type Contact = { id: string; name: string; number: string; rawNumber: string; online: boolean; exists: boolean; messages: Msg[]; };
const normalize = (num: string) => num.replace(/\D/g, "").slice(-8);

export default function Page() {
  const [users, setUsers] = useState<UserAcc[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAcc | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [aName, setAName] = useState(""); const [aNumber, setANumber] = useState(""); const [aPass, setAPass] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState(""); const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState(""); const [newNumber, setNewNumber] = useState("");
  const [inputText, setInputText] = useState(""); const [isRecording, setIsRecording] = useState(false); const [recTime, setRecTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); const chunksRef = useRef<Blob[]>([]); const timerRef = useRef<any>(null); const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = localStorage.getItem("buja_users_v6"); if (u) setUsers(JSON.parse(u));
    const cu = localStorage.getItem("buja_current_v6"); if (cu) setCurrentUser(JSON.parse(cu));
    const c = localStorage.getItem("buja_contacts_v6"); if (c) setContacts(JSON.parse(c));
  }, []);
  useEffect(() => { localStorage.setItem("buja_users_v6", JSON.stringify(users)); }, [users]);
  useEffect(() => { if(currentUser) localStorage.setItem("buja_current_v6", JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem("buja_contacts_v6", JSON.stringify(contacts)); }, [contacts]);
  useEffect(() => { endRef.current?.scrollIntoView({behavior:"smooth"}); }, [contacts, selectedId]);
  useEffect(() => { setContacts(prev => prev.map(contact => { const match = users.find(u => normalize(u.number) === normalize(contact.rawNumber)); return { ...contact, exists: !!match, online: match?.online || false }; })); }, [users]);

  const handleSignup = () => {
    if (!aName.trim() || !aNumber.trim() || !aPass.trim()) return alert("Remplis tout");
    if (users.find(x=>normalize(x.number)===normalize(aNumber))) return alert("Ce numéro a déjà un compte");
    const nu: UserAcc = { name: aName, number: aNumber, password: aPass, online: true };
    setUsers([...users, nu]); setCurrentUser(nu); setAName(""); setANumber(""); setAPass("");
  };
  const handleLogin = () => {
    const found = users.find(x=>normalize(x.number)===normalize(aNumber) && x.password===aPass);
    if (!found) return alert("Numéro ou mot de passe incorrect - Comptes existants: "+users.map(u=>u.number).join(", "));
    const upd = {...found, online: true}; setUsers(users.map(x=>normalize(x.number)===normalize(found.number)?upd:x)); setCurrentUser(upd);
  };
  const logout = () => { if(currentUser){ setUsers(users.map(x=>normalize(x.number)===normalize(currentUser.number)?{...x, online:false}:x)); } setCurrentUser(null); localStorage.removeItem("buja_current_v6"); };
  const addContact = () => {
    if (!newName.trim() || !newNumber.trim()) return;
    const targetUser = users.find(u=>normalize(u.number)===normalize(newNumber));
    const c: Contact = { id: Date.now().toString(), name: newName, number: newNumber, rawNumber: newNumber, online: targetUser?.online || false, exists: !!targetUser, messages: [{ id:"0", text: targetUser ? `✅ ${newName} est sur Buja Connect` : `❌ ${newNumber} n'est pas sur Buja Connect. Comptes existants sur ce navigateur: ${users.map(u=>u.number).join(", ")}`, time:"09:00", me:false, status:"read" }] };
    setContacts([c, ...contacts]); setNewName(""); setNewNumber(""); setShowAdd(false);
  };
  const formatTime = (s:number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`;
  const startRecording = async () => {
    try { const stream = await navigator.mediaDevices.getUserMedia({audio:true}); const mr = new MediaRecorder(stream); mediaRecorderRef.current=mr; chunksRef.current=[]; mr.ondataavailable=e=>{if(e.data.size>0) chunksRef.current.push(e.data);}; mr.onstop=()=>{ const blob = new Blob(chunksRef.current,{type:"audio/ogg; codecs=opus"}); const url=URL.createObjectURL(blob); const sel = contacts.find(c=>c.id===selectedId); if(url && sel){ const st: Msg["status"] = sel.online ? "delivered" : "sent"; const nm: Msg={id:Date.now().toString(), audioUrl:url, time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}), me:true, status:st}; setContacts(prev=>prev.map(c=>c.id===sel.id?{...c,messages:[...c.messages,nm]}:c)); } stream.getTracks().forEach(t=>t.stop()); }; mr.start(); setIsRecording(true); setRecTime(0); timerRef.current=setInterval(()=>setRecTime(t=>t+1),1000); } catch { alert("Autorise le micro"); }
  };
  const stopRecording=()=>{mediaRecorderRef.current?.stop(); setIsRecording(false); if(timerRef.current) clearInterval(timerRef.current);};
  const cancelRecording=()=>{mediaRecorderRef.current?.stop(); chunksRef.current=[]; setIsRecording(false); setRecTime(0); if(timerRef.current) clearInterval(timerRef.current);};
  const sendText=()=>{ if(!inputText.trim() || !selected) return; const nm: Msg={id:Date.now().toString(), text:inputText, time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}), me:true, status:selected.online?"delivered":"sent"}; const selId=selected.id; setContacts(prev=>prev.map(c=>c.id===selId?{...c,messages:[...c.messages,nm]}:c)); setInputText(""); };
  const markAsRead = (contactId: string) => { setSelectedId(contactId); setContacts(prev=>prev.map(c=>c.id===contactId?{...c, messages:c.messages.map(m=>!m.me?{...m, status:"read"} as Msg:m)}:c)); };
  const selected = contacts.find(c=>c.id===selectedId);
  let filtered = contacts.filter(c=> c.name.toLowerCase().includes(search.toLowerCase()) || c.number.includes(search));

  if (!currentUser) {
    return (
      <div style={{height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f0f2f5", fontFamily:"-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"}}>
        <div style={{background:"white", borderRadius:"12px", padding:"28px", width:"90%", maxWidth:"380px", boxShadow:"0 2px 10px rgba(0,0,0,0.1)"}}>
          <div style={{textAlign:"center", marginBottom:"20px"}}>
            <div style={{width:"64px", height:"64px", background:"#25D366", borderRadius:"16px", display:"inline-flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:"28px", fontWeight:800}}>B</div>
            <h1 style={{margin:"12px 0 4px 0", fontSize:"24px", color:"#111b21", fontWeight:700}}>Buja Connect</h1>
            <p style={{color:"#111b21", fontSize:"14px", fontWeight:500, margin:0}}>{authMode==="login" ? "Connecte-toi" : "Crée ton compte"}</p>
          </div>
          {authMode==="signup" && <input value={aName} onChange={e=>setAName(e.target.value)} placeholder="Nom complet" style={{width:"100%", boxSizing:"border-box", border:"2px solid #e9edef", borderRadius:"8px", padding:"14px", marginBottom:"12px", fontSize:"16px", color:"#111b21"}}/>}
          <input value={aNumber} onChange={e=>setANumber(e.target.value)} placeholder="Numéro 66465801" style={{width:"100%", boxSizing:"border-box", border:"2px solid #e9edef", borderRadius:"8px", padding:"14px", marginBottom:"12px", fontSize:"16px", color:"#111b21"}}/>
          <input type="password" value={aPass} onChange={e=>setAPass(e.target.value)} placeholder="Mot de passe" style={{width:"100%", boxSizing:"border-box", border:"2px solid #e9edef", borderRadius:"8px", padding:"14px", marginBottom:"16px", fontSize:"16px", color:"#111b21"}}/>
          <button onClick={authMode==="login"?handleLogin:handleSignup} style={{width:"100%", background:"#25D366", color:"white", border:"none", borderRadius:"8px", padding:"14px", fontWeight:700, fontSize:"16px", cursor:"pointer"}}>{authMode==="login"?"Se connecter":"Créer le compte"}</button>
          <p style={{textAlign:"center", fontSize:"14px", marginTop:"16px", color:"#111b21"}}>{authMode==="login"?"Pas de compte?":"Déjà un compte?"} <span onClick={()=>setAuthMode(authMode==="login"?"signup":"login")} style={{color:"#25D366", cursor:"pointer", fontWeight:700}}>{authMode==="login"?"S'inscrire":"Se connecter"}</span></p>
          <div style={{marginTop:"12px", fontSize:"12px", color:"#111b21", background:"#f0f2f5", padding:"10px", borderRadius:"8px", fontWeight:500}}>TEST: Comptes sur ce navigateur:<br/>{users.length===0?"Aucun compte":users.map(u=>`• ${u.name} - ${u.number} ${u.online?"(en ligne)":"(hors ligne)"}`).join("\n")}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:"flex", height:"100vh", fontFamily:"-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif", background:"#fff"}}>
      <div style={{width:"400px", background:"white", display:"flex", flexDirection:"column", borderRight:"1px solid #e9edef"}}>
        <div style={{height:"68px", padding:"0 16px", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#f0f2f5"}}>
          <div>
            <div style={{fontWeight:800, fontSize:"19px", color:"#111b21"}}>Buja Connect</div>
            {/* NUMÉRO TOUJOURS VISIBLE CORRIGÉ */}
            <div style={{fontSize:"13px", color:"#008069", fontWeight:600}}>{currentUser.name} • {currentUser.number}</div>
          </div>
          <button onClick={()=>setShowAdd(true)} style={{width:"36px", height:"36px", borderRadius:"8px", border:"1px solid #d1d7db", background:"white", cursor:"pointer", fontSize:"18px", fontWeight:700}}>+</button>
        </div>
        <div style={{padding:"8px 12px"}}>
          <div style={{background:"#f0f2f5", borderRadius:"8px", display:"flex", alignItems:"center", padding:"0 12px", height:"40px"}}>
            <span style={{marginRight:"10px", fontSize:"16px"}}>⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher" style={{background:"transparent", border:"none", outline:"none", width:"100%", fontSize:"15px", color:"#111b21"}}/>
          </div>
        </div>
        <div style={{flex:1, overflowY:"auto"}}>
          {filtered.map(c=>(
            <div key={c.id} onClick={()=>markAsRead(c.id)} style={{display:"flex", gap:"12px", padding:"12px 16px", cursor:"pointer", background:selectedId===c.id?"#f0f2f5":"white"}}>
              <div style={{width:"50px", height:"50px", borderRadius:"50%", background:c.exists?"#d9fdd3":"#e9edef", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"18px", color:"#111b21"}}>{c.name[0].toUpperCase()}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex", justifyContent:"space-between"}}><b style={{fontSize:"16px", color:"#111b21"}}>{c.name}</b><span style={{fontSize:"12px", color:"#111b21", fontWeight:500}}>{c.messages[c.messages.length-1]?.time}</span></div>
                {/* NUMÉRO VISIBLE + STATUT NON FLOU */}
                <div style={{fontSize:"13px", color:c.exists?"#008069":"#d93025", fontWeight:700, marginTop:"2px"}}>{c.number} • {c.exists?(c.online?"en ligne":"hors ligne"):"Pas sur Buja Connect"}</div>
                <div style={{fontSize:"14px", color:"#111b21", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"220px", display:"flex", alignItems:"center", gap:"4px", fontWeight:400, marginTop:"2px"}}>
                  {c.messages[c.messages.length-1]?.me && <span style={{color:c.messages[c.messages.length-1]?.status==="read"?"#53bdeb":"#111b21", fontWeight:700}}>{c.messages[c.messages.length-1]?.status==="sent"?"✓":"✓✓"}</span>}
                  <span style={{color:"#111b21"}}>{c.messages[c.messages.length-1]?.text?.slice(0,40)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{flex:1, background:"#efeae2", display:"flex", flexDirection:"column"}}>
        {selected ? (
          <>
            <div style={{height:"68px", background:"#f0f2f5", display:"flex", alignItems:"center", padding:"0 16px", gap:"12px"}}>
              <div style={{width:"42px", height:"42px", borderRadius:"50%", background:"#dfe5e7", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"16px"}}>{selected.name[0].toUpperCase()}</div>
              <div><div style={{fontWeight:700, fontSize:"16px", color:"#111b21"}}>{selected.name}</div><div style={{fontSize:"13px", color:"#111b21", fontWeight:600}}>{selected.number} • {selected.exists?(selected.online?"en ligne":"hors ligne"):"Pas sur Buja Connect"}</div></div>
            </div>
            <div style={{flex:1, padding:"16px", overflowY:"auto", display:"flex", flexDirection:"column", gap:"8px"}}>
              {selected.messages.map(m=>(
                <div key={m.id} style={{alignSelf:m.me?"flex-end":"flex-start", background:m.me?"#d9fdd3":"white", padding:"10px 12px", borderRadius:"8px", maxWidth:"75%", boxShadow:"0 1px 1px rgba(0,0,0,0.1)"}}>
                  {m.text && <span style={{fontSize:"15px", color:"#111b21", fontWeight:400, wordBreak:"break-word"}}>{m.text}</span>}
                  {m.audioUrl && <audio controls src={m.audioUrl} style={{width:"220px"}}/>}
                  <div style={{display:"flex", justifyContent:"flex-end", alignItems:"center", gap:"4px", marginTop:"4px"}}>
                    <span style={{fontSize:"11px", color:"#111b21", fontWeight:500}}>{m.time}</span>
                    {m.me && <span style={{fontSize:"13px", fontWeight:700, color:m.status==="read"?"#53bdeb":"#111b21"}}>{m.status==="sent"?"✓":"✓✓"}</span>}
                  </div>
                </div>
              ))}
              <div ref={endRef}/>
            </div>
            <div style={{height:"68px", background:"#f0f2f5", display:"flex", alignItems:"center", padding:"0 12px", gap:"8px"}}>
              {isRecording ? (
                <div style={{flex:1, display:"flex", alignItems:"center", gap:"12px", background:"white", borderRadius:"24px", padding:"0 14px", height:"44px"}}>
                  <button onClick={cancelRecording} style={{background:"transparent", border:"none", fontSize:"18px", cursor:"pointer"}}>🗑️</button>
                  <div style={{width:"10px", height:"10px", background:"red", borderRadius:"50%"}}></div>
                  <span style={{flex:1, fontSize:"15px", fontWeight:600, color:"#111b21"}}>{formatTime(recTime)}</span>
                  <button onClick={stopRecording} style={{background:"#25D366", border:"none", width:"34px", height:"34px", borderRadius:"50%", color:"white", cursor:"pointer"}}>▶</button>
                </div>
              ) : (
                <>
                  <input value={inputText} onChange={e=>setInputText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendText()} placeholder={selected.exists?"Entrez un message":"Non enregistré"} disabled={!selected.exists} style={{flex:1, height:"44px", borderRadius:"8px", border:"none", padding:"0 14px", outline:"none", background:"white", fontSize:"16px", color:"#111b21"}}/>
                  {selected.exists && (inputText.trim() ? <button onClick={sendText} style={{background:"#25D366", border:"none", width:"44px", height:"44px", borderRadius:"50%", color:"white", cursor:"pointer", fontSize:"18px"}}>➤</button> : <button onClick={startRecording} style={{background:"#25D366", border:"none", width:"44px", height:"44px", borderRadius:"50%", color:"white", cursor:"pointer", fontSize:"18px"}}>🎤</button>)}
                </>
              )}
            </div>
          </>
        ) : (
          <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column"}}><div style={{width:"64px", height:"64px", background:"#25D366", borderRadius:"16px", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:"28px", fontWeight:800}}>B</div><h2 style={{fontWeight:300, color:"#111b21", marginTop:"16px"}}>Buja Connect</h2><p style={{color:"#111b21", fontWeight:500}}>Sélectionne un contact</p></div>
        )}
      </div>
      {showAdd && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:99}}>
          <div style={{background:"white", borderRadius:"12px", padding:"24px", width:"90%", maxWidth:"360px"}}>
            <h3 style={{margin:"0 0 16px 0", color:"#111b21", fontSize:"18px"}}>Nouveau contact</h3>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nom ex: YVES" style={{width:"100%", boxSizing:"border-box", border:"2px solid #e9edef", borderRadius:"8px", padding:"14px", marginBottom:"12px", fontSize:"16px", color:"#111b21"}}/>
            <input value={newNumber} onChange={e=>setNewNumber(e.target.value)} placeholder="Numéro 66465801" style={{width:"100%", boxSizing:"border-box", border:"2px solid #e9edef", borderRadius:"8px", padding:"14px", marginBottom:"8px", fontSize:"16px", color:"#111b21"}}/>
            <p style={{fontSize:"12px", color:"#111b21", fontWeight:500, margin:"0 0 12px 0"}}>On compare les 8 derniers chiffres. Comptes sur ce navigateur: {users.map(u=>u.number).join(", ") || "aucun"}</p>
            <div style={{display:"flex", justifyContent:"flex-end", gap:"8px"}}>
              <button onClick={()=>setShowAdd(false)} style={{padding:"10px 16px", border:"none", background:"transparent", cursor:"pointer", fontSize:"15px", fontWeight:600, color:"#111b21"}}>Annuler</button>
              <button onClick={addContact} style={{padding:"10px 20px", border:"none", background:"#25D366", color:"white", borderRadius:"20px", cursor:"pointer", fontSize:"15px", fontWeight:700}}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
      <button onClick={logout} style={{position:"absolute", top:"8px", left:"8px", fontSize:"11px", border:"none", background:"#f0f2f5", padding:"4px 8px", borderRadius:"6px", cursor:"pointer", color:"#111b21", fontWeight:600}}>Déco</button>
    </div>
  );
}
