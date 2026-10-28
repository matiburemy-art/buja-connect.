"use client";
import { useState, useEffect, useRef } from "react";

type UserAcc = { name: string; number: string; password: string; online: boolean; };
type Msg = { id: string; text?: string; audioUrl?: string; time: string; me: boolean; status: "sent" | "delivered" | "read"; };
type Contact = { id: string; name: string; number: string; rawNumber: string; online: boolean; exists: boolean; messages: Msg[]; };

// FONCTION QUI RÉPARE LE BUG
const normalize = (num: string) => num.replace(/\D/g, "").slice(-8); // garde les 8 derniers chiffres

export default function Page() {
  const [users, setUsers] = useState<UserAcc[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAcc | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [aName, setAName] = useState(""); const [aNumber, setANumber] = useState(""); const [aPass, setAPass] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("Toutes");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState(""); const [newNumber, setNewNumber] = useState("");
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false); const [recTime, setRecTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); const chunksRef = useRef<Blob[]>([]); const timerRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = localStorage.getItem("buja_users_v5"); if (u) setUsers(JSON.parse(u));
    const cu = localStorage.getItem("buja_current_v5"); if (cu) setCurrentUser(JSON.parse(cu));
    const c = localStorage.getItem("buja_contacts_v5"); if (c) setContacts(JSON.parse(c));
  }, []);
  useEffect(() => { localStorage.setItem("buja_users_v5", JSON.stringify(users)); }, [users]);
  useEffect(() => { if(currentUser) localStorage.setItem("buja_current_v5", JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem("buja_contacts_v5", JSON.stringify(contacts)); }, [contacts]);
  useEffect(() => { endRef.current?.scrollIntoView({behavior:"smooth"}); }, [contacts, selectedId]);
  
  // CORRECTION: met à jour automatiquement online/exists quand un user se connecte/déconnecte
  useEffect(() => {
    setContacts(prev => prev.map(contact => {
      const match = users.find(u => normalize(u.number) === normalize(contact.rawNumber));
      return { ...contact, exists: !!match, online: match?.online || false };
    }));
  }, [users]);

  const handleSignup = () => {
    if (!aName.trim() || !aNumber.trim() || !aPass.trim()) return alert("Remplis tout");
    if (users.find(x=>normalize(x.number)===normalize(aNumber))) return alert("Ce numéro a déjà un compte");
    const nu: UserAcc = { name: aName, number: aNumber, password: aPass, online: true };
    setUsers([...users, nu]); setCurrentUser(nu); setAName(""); setANumber(""); setAPass("");
  };
  const handleLogin = () => {
    const found = users.find(x=>normalize(x.number)===normalize(aNumber) && x.password===aPass);
    if (!found) return alert("Numéro ou mot de passe incorrect");
    const upd = {...found, online: true}; setUsers(users.map(x=>normalize(x.number)===normalize(found.number)?upd:x)); setCurrentUser(upd);
  };
  const logout = () => { if(currentUser){ setUsers(users.map(x=>normalize(x.number)===normalize(currentUser.number)?{...x, online:false}:x)); } setCurrentUser(null); localStorage.removeItem("buja_current_v5"); };

  const addContact = () => {
    if (!newName.trim() || !newNumber.trim()) return;
    const targetUser = users.find(u=>normalize(u.number)===normalize(newNumber));
    const existsInBuja = !!targetUser;
    const c: Contact = {
      id: Date.now().toString(), name: newName, number: newNumber, rawNumber: newNumber,
      online: targetUser?.online || false, exists: existsInBuja,
      messages: [{ id:"0", text: existsInBuja ? `✅ ${newName} est sur Buja Connect` : `❌ ${newNumber} n'est pas enregistré sur Buja Connect`, time:"09:00", me:false, status:"read" }]
    };
    setContacts([c, ...contacts]); setNewName(""); setNewNumber(""); setShowAdd(false);
  };

  const formatTime = (s:number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`;
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const mr = new MediaRecorder(stream); mediaRecorderRef.current=mr; chunksRef.current=[];
      mr.ondataavailable=e=>{if(e.data.size>0) chunksRef.current.push(e.data);};
      mr.onstop=()=>{
        const blob = new Blob(chunksRef.current,{type:"audio/ogg; codecs=opus"}); const url=URL.createObjectURL(blob);
        const sel = contacts.find(c=>c.id===selectedId);
        if(url && sel){
          const st: Msg["status"] = sel.online ? "delivered" : "sent";
          const nm: Msg={id:Date.now().toString(), audioUrl:url, time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}), me:true, status:st};
          setContacts(prev=>prev.map(c=>c.id===sel.id?{...c,messages:[...c.messages,nm]}:c));
        }
        stream.getTracks().forEach(t=>t.stop());
      };
      mr.start(); setIsRecording(true); setRecTime(0); timerRef.current=setInterval(()=>setRecTime(t=>t+1),1000);
    } catch { alert("Autorise le micro"); }
  };
  const stopRecording=()=>{mediaRecorderRef.current?.stop(); setIsRecording(false); if(timerRef.current) clearInterval(timerRef.current);};
  const cancelRecording=()=>{mediaRecorderRef.current?.stop(); chunksRef.current=[]; setIsRecording(false); setRecTime(0); if(timerRef.current) clearInterval(timerRef.current);};
  const sendText=()=>{
    if(!inputText.trim() || !selected) return;
    const initialStatus: Msg["status"] = selected.online ? "delivered" : "sent";
    const nm: Msg={id:Date.now().toString(), text:inputText, time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}), me:true, status:initialStatus};
    const selId=selected.id;
    setContacts(prev=>prev.map(c=>c.id===selId?{...c,messages:[...c.messages,nm]}:c));
    setInputText("");
  };
  const markAsRead = (contactId: string) => {
    setSelectedId(contactId);
    setContacts(prev=>prev.map(c=>c.id===contactId?{...c, messages:c.messages.map(m=>!m.me?{...m, status:"read"} as Msg:m)}:c));
  };

  const selected = contacts.find(c=>c.id===selectedId);
  let filtered = contacts.filter(c=> c.name.toLowerCase().includes(search.toLowerCase()) || c.number.includes(search));
  if(filter==="Non lues") filtered=filtered.filter(c=>c.messages.some(m=>!m.me && m.status!=="read"));

  if (!currentUser) {
    return (
      <div style={{height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f0f2f5", fontFamily:"Segoe UI, sans-serif"}}>
        <div style={{background:"white", borderRadius:"12px", padding:"32px", width:"360px", boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>
          <div style={{textAlign:"center", marginBottom:"24px"}}>
            <div style={{width:"60px", height:"60px", background:"#25D366", borderRadius:"16px", display:"inline-flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:"28px", fontWeight:800}}>B</div>
            <h1 style={{margin:"12px 0 4px 0"}}>Buja Connect</h1>
            <p style={{color:"#667781", fontSize:"13px", margin:0}}>{authMode==="login" ? "Connecte-toi" : "Crée ton compte"}</p>
          </div>
          {authMode==="signup" && <input value={aName} onChange={e=>setAName(e.target.value)} placeholder="Nom complet" style={{width:"100%", boxSizing:"border-box", border:"1px solid #e9edef", borderRadius:"8px", padding:"12px", marginBottom:"12px"}}/>}
          <input value={aNumber} onChange={e=>setANumber(e.target.value)} placeholder="Numéro ex: 66465801 ou +25766465801" style={{width:"100%", boxSizing:"border-box", border:"1px solid #e9edef", borderRadius:"8px", padding:"12px", marginBottom:"12px"}}/>
          <input type="password" value={aPass} onChange={e=>setAPass(e.target.value)} placeholder="Mot de passe" style={{width:"100%", boxSizing:"border-box", border:"1px solid #e9edef", borderRadius:"8px", padding:"12px", marginBottom:"16px"}}/>
          <button onClick={authMode==="login"?handleLogin:handleSignup} style={{width:"100%", background:"#25D366", color:"white", border:"none", borderRadius:"8px", padding:"12px", fontWeight:600, cursor:"pointer"}}>{authMode==="login"?"Se connecter":"Créer le compte"}</button>
          <p style={{textAlign:"center", fontSize:"13px", marginTop:"16px"}}>{authMode==="login"?"Pas de compte?":"Déjà un compte?"} <span onClick={()=>setAuthMode(authMode==="login"?"signup":"login")} style={{color:"#25D366", cursor:"pointer", fontWeight:600}}>{authMode==="login"?"S'inscrire":"Se connecter"}</span></p>
          {users.length>0 && <div style={{marginTop:"16px", fontSize:"11px", color:"#667781", background:"#f0f2f5", padding:"8px", borderRadius:"6px"}}>Comptes existants: {users.map(u=>`${u.name}:${u.number}`).join(", ")}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{display:"flex", height:"100vh", fontFamily:"Segoe UI, sans-serif", background:"#f0f2f5"}}>
      <div style={{width:"64px", background:"#f0f2f5", borderRight:"1px solid #e9edef", display:"flex", flexDirection:"column", alignItems:"center", paddingTop:"12px"}}>
        <div style={{width:"40px", height:"40px", background:"#25D366", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800}}>B</div>
        <button onClick={logout} style={{marginTop:"20px", fontSize:"10px", border:"none", background:"transparent", cursor:"pointer", color:"#667781"}}>Déco</button>
      </div>
      <div style={{width:"360px", background:"white", display:"flex", flexDirection:"column"}}>
        <div style={{height:"59px", padding:"0 16px", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <div><div style={{fontWeight:800, fontSize:"18px"}}>Buja Connect</div><div style={{fontSize:"12px", color:"#25D366"}}>{currentUser.name}</div></div>
          <button onClick={()=>setShowAdd(true)} style={{width:"30px", height:"30px", borderRadius:"6px", border:"1px solid #e9edef", background:"white", cursor:"pointer"}}>+</button>
        </div>
        <div style={{padding:"8px 12px"}}>
          <div style={{background:"#f0f2f5", borderRadius:"8px", display:"flex", alignItems:"center", padding:"0 12px", height:"36px"}}>
            <span style={{marginRight:"12px"}}>⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher" style={{background:"transparent", border:"none", outline:"none", width:"100%"}}/>
          </div>
        </div>
        <div style={{display:"flex", gap:"6px", padding:"8px 12px"}}>
          {["Toutes","Non lues"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:"6px 12px", borderRadius:"20px", border:"none", cursor:"pointer", background:filter===f?"#e7fce3":"#f0f2f5", color:filter===f?"#008069":"#54656f"}}>{f}</button>
          ))}
        </div>
        <div style={{flex:1, overflowY:"auto"}}>
          {filtered.map(c=>(
            <div key={c.id} onClick={()=>markAsRead(c.id)} style={{display:"flex", gap:"10px", padding:"10px 12px", cursor:"pointer", background:selectedId===c.id?"#f0f2f5":"white"}}>
              <div style={{width:"49px", height:"49px", borderRadius:"50%", background:c.exists?"#d9fdd3":"#f0f2f5", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"bold"}}>{c.name[0].toUpperCase()}</div>
              <div style={{flex:1, borderBottom:"1px solid #f0f2f5"}}>
                <div style={{display:"flex", justifyContent:"space-between"}}><b>{c.name}</b><span style={{fontSize:"11px", color:"#667781"}}>{c.messages[c.messages.length-1]?.time}</span></div>
                <div style={{fontSize:"12px", color:c.exists?"#25D366":"#f15c6d"}}>{c.exists?"✅ Sur Buja Connect":"❌ Pas enregistré"} • {c.online?"en ligne":"hors ligne"}</div>
                <div style={{fontSize:"13px", color:"#667781", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"180px", display:"flex", alignItems:"center", gap:"4px"}}>
                  {c.messages[c.messages.length-1]?.me && <span style={{color:c.messages[c.messages.length-1]?.status==="read"?"#53bdeb":"#667781"}}>{c.messages[c.messages.length-1]?.status==="sent"?"✓":"✓✓"}</span>}
                  {c.messages[c.messages.length-1]?.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{flex:1, background:"#efeae2", display:"flex", flexDirection:"column"}}>
        {selected ? (
          <>
            <div style={{height:"59px", background:"#f0f2f5", display:"flex", alignItems:"center", padding:"0 16px", gap:"12px"}}>
              <div style={{width:"40px", height:"40px", borderRadius:"50%", background:"#dfe5e7", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"bold"}}>{selected.name[0].toUpperCase()}</div>
              <div><div style={{fontWeight:600}}>{selected.name}</div><div style={{fontSize:"12px", color:selected.online?"#25D366":"#667781"}}>{selected.exists? (selected.online?"en ligne":"hors ligne") : "Pas sur Buja Connect"} • {selected.number}</div></div>
            </div>
            <div style={{flex:1, padding:"20px", overflowY:"auto", display:"flex", flexDirection:"column", gap:"8px"}}>
              {selected.messages.map(m=>(
                <div key={m.id} style={{alignSelf:m.me?"flex-end":"flex-start", background:m.me?"#d9fdd3":"white", padding:"8px 12px", borderRadius:"8px", maxWidth:"65%", boxShadow:"0 1px 0.5px rgba(0,0,0,0.13)"}}>
                  {m.text && <span style={{fontSize:"14px", wordBreak:"break-word"}}>{m.text}</span>}
                  {m.audioUrl && <audio controls src={m.audioUrl} style={{width:"220px"}}/>}
                  <div style={{display:"flex", justifyContent:"flex-end", alignItems:"center", gap:"4px", marginTop:"4px"}}>
                    <span style={{fontSize:"11px", color:"#667781"}}>{m.time}</span>
                    {m.me && <span style={{fontSize:"13px", fontWeight:"bold", color:m.status==="read"?"#53bdeb":"#667781"}}>{m.status==="sent"?"✓":"✓✓"}</span>}
                  </div>
                </div>
              ))}
              <div ref={endRef}/>
            </div>
            <div style={{height:"62px", background:"#f0f2f5", display:"flex", alignItems:"center", padding:"0 16px", gap:"12px"}}>
              {isRecording ? (
                <div style={{flex:1, display:"flex", alignItems:"center", gap:"16px", background:"white", borderRadius:"24px", padding:"0 16px", height:"42px"}}>
                  <button onClick={cancelRecording} style={{background:"transparent", border:"none", fontSize:"20px", cursor:"pointer"}}>🗑️</button>
                  <div style={{width:"10px", height:"10px", background:"red", borderRadius:"50%"}}></div>
                  <span style={{flex:1}}>{formatTime(recTime)}</span>
                  <button onClick={stopRecording} style={{background:"#25D366", border:"none", width:"32px", height:"32px", borderRadius:"50%", color:"white", cursor:"pointer"}}>▶</button>
                </div>
              ) : (
                <>
                  <input value={inputText} onChange={e=>setInputText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendText()} placeholder={selected.exists?"Entrez un message":"Ce contact n'est pas sur Buja Connect"} disabled={!selected.exists} style={{flex:1, height:"42px", borderRadius:"8px", border:"none", padding:"0 12px", outline:"none", background:selected.exists?"white":"#f0f2f5"}}/>
                  {selected.exists && (inputText.trim() ? <button onClick={sendText} style={{background:"#25D366", border:"none", width:"42px", height:"42px", borderRadius:"50%", color:"white", cursor:"pointer"}}>➤</button> : <button onClick={startRecording} style={{background:"#25D366", border:"none", width:"42px", height:"42px", borderRadius:"50%", color:"white", cursor:"pointer"}}>🎤</button>)}
                </>
              )}
            </div>
          </>
        ) : (
          <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column"}}><h2 style={{fontWeight:300}}>Buja Connect</h2><p style={{color:"#667781"}}>Sélectionne un contact</p></div>
        )}
      </div>

      {showAdd && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:99}}>
          <div style={{background:"white", borderRadius:"12px", padding:"24px", width:"360px"}}>
            <h3 style={{margin:"0 0 16px 0"}}>Nouveau contact</h3>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nom ex: YVES" style={{width:"100%", boxSizing:"border-box", border:"1px solid #e9edef", borderRadius:"8px", padding:"12px", marginBottom:"12px"}}/>
            <input value={newNumber} onChange={e=>setNewNumber(e.target.value)} placeholder="Numéro 66465801 ou +25766465801" style={{width:"100%", boxSizing:"border-box", border:"1px solid #e9edef", borderRadius:"8px", padding:"12px", marginBottom:"16px"}}/>
            <div style={{display:"flex", justifyContent:"flex-end", gap:"8px"}}>
              <button onClick={()=>setShowAdd(false)} style={{padding:"8px 16px", border:"none", background:"transparent", cursor:"pointer"}}>Annuler</button>
              <button onClick={addContact} style={{padding:"8px 20px", border:"none", background:"#25D366", color:"white", borderRadius:"20px", cursor:"pointer"}}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
