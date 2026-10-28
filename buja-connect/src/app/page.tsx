"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null as any;

type UserAcc = { name: string; number: string; password: string; online: boolean; };
type Contact = { id: string; name: string; number: string; online: boolean; exists: boolean; };
type MsgDB = { id: string; from_number: string; to_number: string; text: string; created_at: string; };
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
  const endRef = useRef<HTMLDivElement>(null);

  const loadUsers = async () => {
    if(!supabase){ const u = localStorage.getItem("buja_users_backup"); if(u) setUsers(JSON.parse(u)); return; }
    const { data } = await supabase.from("users").select("*"); if(data) setUsers(data as any);
  };
  const loadStatuses = async () => { if(!supabase) return; const { data } = await supabase.from("statuses").select("*").order("created_at",{ascending:false}); if(data) setStatuses(data); };
  const loadMessages = async () => {
    if(!supabase || !currentUser) return;
    const { data } = await supabase.from("messages").select("*").or(`from_number.eq.${currentUser.number},to_number.eq.${currentUser.number}`).order("created_at",{ascending:true});
    if(data) setMessages(data);
  };

  useEffect(() => { loadUsers(); loadStatuses(); const c = localStorage.getItem("buja_contacts_v8"); if(c) setContacts(JSON.parse(c)); const cu = localStorage.getItem("buja_current_v8"); if(cu) setCurrentUser(JSON.parse(cu)); }, []);
  useEffect(() => { localStorage.setItem("buja_contacts_v8", JSON.stringify(contacts)); }, [contacts]);
  useEffect(() => { if(currentUser) loadMessages(); const interval = setInterval(()=>{ if(currentUser) loadMessages(); loadUsers(); }, 3000); return ()=>clearInterval(interval); }, [currentUser, selected]);
  useEffect(() => { endRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages, selected]);

  // Nettoie les doublons YVES
  const cleanedContacts = contacts.filter((c,i,arr)=> i===arr.findIndex(x=>normalize(x.number)===normalize(c.number)));

  const handleSignup = async () => {
    if(!aName||!aNumber||!aPass) return alert("Remplis tout");
    if(!supabase){ const nu={name:aName, number:aNumber, password:aPass, online:true}; const all=[...users, nu]; setUsers(all); localStorage.setItem("buja_users_backup", JSON.stringify(all)); setCurrentUser(nu); localStorage.setItem("buja_current_v8", JSON.stringify(nu)); return; }
    const { error } = await supabase.from("users").insert([{name:aName, number:aNumber, password:aPass, online:true}]); if(error) return alert("Numéro déjà utilisé");
    const nu={name:aName, number:aNumber, password:aPass, online:true}; setCurrentUser(nu); localStorage.setItem("buja_current_v8", JSON.stringify(nu)); loadUsers();
  };
  const handleLogin = async () => {
    if(!supabase){ const f=users.find(u=>normalize(u.number)===normalize(aNumber) && u.password===aPass); if(!f) return alert("Faux"); setCurrentUser(f); localStorage.setItem("buja_current_v8", JSON.stringify(f)); return; }
    const { data } = await supabase.from("users").select("*").eq("number", aNumber).eq("password", aPass).single(); if(!data) return alert("Faux"); await supabase.from("users").update({online:true}).eq("number", aNumber); setCurrentUser(data as any); localStorage.setItem("buja_current_v8", JSON.stringify(data)); loadUsers();
  };
  const logout = async () => { if(supabase && currentUser) await supabase.from("users").update({online:false}).eq("number", currentUser.number); setCurrentUser(null); setSelected(null); localStorage.removeItem("buja_current_v8"); };

  const addContact = async () => {
    if(!newName||!newNumber) return; await loadUsers();
    const found = users.find(u=>normalize(u.number)===normalize(newNumber)); const exists=!!found;
    // évite doublon
    if(cleanedContacts.some(c=>normalize(c.number)===normalize(newNumber))) return alert("Contact déjà ajouté");
    const c: Contact = {id:Date.now().toString(), name:newName, number:newNumber, online:found?.online||false, exists};
    setContacts([c, ...contacts]); setShowAdd(false); setNewName(""); setNewNumber("");
  };
  const addStatus = async () => { if(!statusText.trim()||!currentUser||!supabase) return; await supabase.from("statuses").insert([{user_number:currentUser.number, user_name:currentUser.name, text:statusText}]); setStatusText(""); setShowStatusAdd(false); loadStatuses(); };
  const sendText = async () => {
    if(!inputText.trim()||!selected||!currentUser) return;
    if(!supabase){ alert("Ajoute Supabase pour envoyer vraiment"); return; }
    await supabase.from("messages").insert([{from_number:currentUser.number, to_number:selected.number, text:inputText}]);
    setInputText(""); loadMessages();
  };

  const chatMessages = messages.filter(m=> selected && ( (normalize(m.from_number)===normalize(currentUser!.number) && normalize(m.to_number)===normalize(selected.number)) || (normalize(m.from_number)===normalize(selected.number) && normalize(m.to_number)===normalize(currentUser!.number)) ));

  if(!currentUser){
    return (
      <div style={{height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#111b21", padding:16}}>
        <div style={{background:"white", padding:24, borderRadius:16, width:"100%", maxWidth:360}}>
          <div style={{textAlign:"center", marginBottom:16}}><div style={{width:56, height:56, background:"#25D366", borderRadius:12, display:"inline-flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800, fontSize:24}}>B</div><h2 style={{margin:"8px 0", color:"#111b21"}}>Buja Connect</h2></div>
          {authMode==="signup" && <input value={aName} onChange={e=>setAName(e.target.value)} placeholder="Nom" style={{width:"100%", padding:14, marginBottom:10, borderRadius:10, border:"1px solid #ddd", fontSize:16}}/>}
          <input value={aNumber} onChange={e=>setANumber(e.target.value)} placeholder="Numéro 66465801" style={{width:"100%", padding:14, marginBottom:10, borderRadius:10, border:"1px solid #ddd", fontSize:16}}/>
          <input type="password" value={aPass} onChange={e=>setAPass(e.target.value)} placeholder="Mot de passe" style={{width:"100%", padding:14, marginBottom:12, borderRadius:10, border:"1px solid #ddd", fontSize:16}}/>
          <button onClick={authMode==="login"?handleLogin:handleSignup} style={{width:"100%", padding:14, background:"#25D366", color:"white", border:"none", borderRadius:10, fontWeight:700, fontSize:16}}>{authMode==="login"?"Se connecter":"Créer compte"}</button>
          <p style={{textAlign:"center", fontSize:14, marginTop:12, color:"#25D366", fontWeight:600}} onClick={()=>setAuthMode(authMode==="login"?"signup":"login")}>{authMode==="login"?"Pas de compte ? S'inscrire":"Déjà un compte ?"}</p>
        </div>
      </div>
    );
  }

  // DESIGN MOBILE - Si chat ouvert, on cache la liste
  const showChatOnMobile = !!selected;

  return (
    <div style={{display:"flex", height:"100vh", width:"100vw", fontFamily:"-apple-system, sans-serif", background:"#fff", overflow:"hidden"}}>
      {/* LISTE - cachée sur mobile si chat ouvert */}
      <div style={{width:"100%", maxWidth:450, background:"white", display: showChatOnMobile ? "none" : "flex", flexDirection:"column", borderRight:"1px solid #e9edef"}}>
        <div style={{height:60, background:"#008069", color:"white", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px"}}>
          <b style={{fontSize:20}}>Buja Connect</b>
          <div style={{display:"flex", gap:16, alignItems:"center"}}><span onClick={()=>setShowAdd(true)} style={{fontSize:22, cursor:"pointer"}}>＋</span><span onClick={logout} style={{fontSize:13, cursor:"pointer"}}>Déco</span></div>
        </div>
        {tab==="disc" && (
          <>
            <div style={{padding:8, background:"#f0f2f5"}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher" style={{width:"100%", background:"white", border:"none", borderRadius:20, padding:"10px 16px", fontSize:15}}/></div>
            <div style={{flex:1, overflowY:"auto"}}>
              {cleanedContacts.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())).map(c=>{
                const lastMsg = [...messages].reverse().find(m=> normalize(m.from_number)===normalize(c.number) || normalize(m.to_number)===normalize(c.number));
                return (
                <div key={c.id} onClick={()=>setSelected(c)} style={{display:"flex", gap:12, padding:"12px 16px"}}>
                  <div style={{width:50, height:50, borderRadius:"50%", background:c.exists?"#d9fdd3":"#e9edef", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:18}}>{c.name[0].toUpperCase()}</div>
                  <div style={{flex:1, borderBottom:"1px solid #f2f2f2", paddingBottom:12}}>
                    <div style={{display:"flex", justifyContent:"space-between"}}><b style={{fontSize:16, color:"#111b21"}}>{c.name}</b><span style={{fontSize:11, color:"#667781"}}>{lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}) : "09:00"}</span></div>
                    <div style={{fontSize:13, color:c.exists?"#008069":"#e11", fontWeight:700}}>{c.number} • {c.exists?"Sur Buja":"Pas sur Buja"}</div>
                    <div style={{fontSize:14, color:"#667781", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:220}}>{lastMsg?.text || (c.exists ? `✅ ${c.name} est sur Buja Connect` : `❌ Pas sur Buja`)}</div>
                  </div>
                </div>
              )})}
              {cleanedContacts.length===0 && <div style={{textAlign:"center", marginTop:80}}><p style={{color:"#888"}}>Aucune discussion</p><button onClick={()=>setShowAdd(true)} style={{background:"#25D366", color:"white", border:"none", padding:"10px 20px", borderRadius:20, marginTop:10, fontWeight:700}}>Nouveau contact</button></div>}
              {/* BOUTON NETTOYER DOUBLONS */}
              <div style={{textAlign:"center", padding:12}}><button onClick={()=>{setContacts(cleanedContacts); localStorage.setItem("buja_contacts_v8", JSON.stringify(cleanedContacts));}} style={{fontSize:11, border:"none", background:"#f0f2f5", padding:"6px 12px", borderRadius:12}}>Nettoyer doublons</button></div>
            </div>
          </>
        )}
        {tab==="actu" && (
          <div style={{flex:1, overflowY:"auto"}}>
            <div style={{padding:16, display:"flex", gap:12, alignItems:"center"}} onClick={()=>setShowStatusAdd(true)}><div style={{width:52, height:52, borderRadius:"50%", background:"#f0f2f5", border:"2px dashed #25D366", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22}}>+</div><div><b>Mon statut</b><div style={{fontSize:13, color:"#667781"}}>Ajouter un statut</div></div></div>
            <div style={{background:"#f0f2f5", padding:"8px 16px", fontSize:13, color:"#667781", fontWeight:600}}>RÉCENTS</div>
            {statuses.map(s=><div key={s.id} style={{display:"flex", gap:12, padding:"12px 16px"}}><div style={{width:50, height:50, borderRadius:"50%", border:"3px solid #25D366", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700}}>{s.user_name[0]}</div><div><b>{s.user_name}</b><div style={{fontSize:13, color:"#667781"}}>{s.text?.slice(0,40)}</div></div></div>)}
          </div>
        )}
        {tab==="comm" && <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", padding:32, textAlign:"center"}}><div style={{fontSize:60}}>👥</div><h3>Communautés</h3><p style={{color:"#888", fontSize:14}}>Bientôt</p></div>}
        {tab==="appels" && <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#888"}}>Aucun appel</div>}

        {/* ONGLETS BAS MOBILE MANIPULABLE */}
        <div style={{height:70, borderTop:"1px solid #e9edef", display:"flex", background:"white"}}>
          {[
            {id:"disc", label:"Disc.", icon:"💬"},
            {id:"actu", label:"Actus", icon:"⭕"},
            {id:"comm", label:"Commu.", icon:"👥"},
            {id:"appels", label:"Appels", icon:"📞"},
          ].map(t=>(
            <div key={t.id} onClick={()=>setTab(t.id as any)} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:tab===t.id?"#008069":"#667781"}}>
              <span style={{fontSize:22}}>{t.icon}</span><span style={{fontSize:11, fontWeight:tab===t.id?700:400}}>{t.label}</span>
              {tab===t.id && <div style={{width:4, height:4, background:"#008069", borderRadius:"50%", marginTop:4}}/>}
            </div>
          ))}
        </div>
      </div>

      {/* CHAT - plein écran sur mobile */}
      {selected && (
        <div style={{flex:1, background:"#efeae2", display:"flex", flexDirection:"column", width:"100%"}}>
          <div style={{height:60, background:"#008069", color:"white", display:"flex", alignItems:"center", padding:"0 12px", gap:10}}>
            <span onClick={()=>setSelected(null)} style={{fontSize:22, cursor:"pointer", padding:"4px 8px"}}>←</span>
            <div style={{width:40, height:40, borderRadius:"50%", background:"white", color:"#008069", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700}}>{selected.name[0]}</div>
            <div style={{flex:1}}><b style={{fontSize:16}}>{selected.name}</b><div style={{fontSize:12, opacity:0.9}}>{selected.number} • {selected.exists?(selected.online?"en ligne":"hors ligne"):"Pas sur Buja"}</div></div>
            <span>📞</span>
          </div>
          <div style={{flex:1, padding:"12px", overflowY:"auto", display:"flex", flexDirection:"column", gap:6, backgroundImage:"url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')"}}>
            {chatMessages.length===0 && <div style={{alignSelf:"center", background:"#fff8c4", padding:"8px 12px", borderRadius:8, fontSize:12, marginTop:20}}>✅ {selected.name} est sur Buja Connect • Les messages sont chiffrés</div>}
            {chatMessages.map(m=>{
              const isMe = normalize(m.from_number)===normalize(currentUser.number);
              return <div key={m.id} style={{alignSelf:isMe?"flex-end":"flex-start", background:isMe?"#d9fdd3":"white", padding:"8px 12px", borderRadius: isMe?"8px 0 8px 8px":"0 8px 8px 8px", maxWidth:"78%", boxShadow:"0 1px 0.5px rgba(0,0,0,0.13)"}}><span style={{fontSize:15, color:"#111b21"}}>{m.text}</span><div style={{fontSize:10, color:"#667781", textAlign:"right", marginTop:4}}>{new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})} {isMe && "✓✓"}</div></div>
            })}
            <div ref={endRef}/>
          </div>
          <div style={{minHeight:62, background:"#f0f2f5", display:"flex", alignItems:"center", padding:"6px 8px", gap:8}}>
            <div style={{flex:1, background:"white", borderRadius:24, display:"flex", alignItems:"center", padding:"0 4px 0 12px", minHeight:44}}>
              <input value={inputText} onChange={e=>setInputText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendText()} placeholder="Message" style={{flex:1, border:"none", outline:"none", fontSize:16, background:"transparent", padding:"10px 0"}}/>
              <span style={{padding:"0 8px"}}>📎 😊</span>
            </div>
            <button onClick={sendText} style={{width:48, height:48, borderRadius:"50%", background:"#008069", color:"white", border:"none", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center"}}>➤</button>
          </div>
        </div>
      )}

      {!selected && (
        <div style={{flex:1, background:"#f0f2f5", display:"none", alignItems:"center", justifyContent:"center", flexDirection:"column"}} className="desktop-only">
          <div style={{width:80, height:80, background:"#25D366", borderRadius:20, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:32, fontWeight:800}}>B</div><p style={{color:"#667781", marginTop:16}}>Sélectionne une discussion</p>
        </div>
      )}

      {showAdd && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:99}}>
          <div style={{background:"white", width:"100%", maxWidth:450, borderRadius:"20px 20px 0 0", padding:24}}>
            <h3 style={{marginTop:0}}>Nouveau contact</h3>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nom ex: YVES" style={{width:"100%", padding:14, marginBottom:10, borderRadius:12, border:"1px solid #ddd", fontSize:16}}/>
            <input value={newNumber} onChange={e=>setNewNumber(e.target.value)} placeholder="Numéro 66465801" style={{width:"100%", padding:14, marginBottom:8, borderRadius:12, border:"1px solid #ddd", fontSize:16}}/>
            <p style={{fontSize:11, color:"#888"}}>Vérification Supabase: {users.length} comptes</p>
            <div style={{display:"flex", gap:10, marginTop:16}}><button onClick={()=>setShowAdd(false)} style={{flex:1, padding:14, borderRadius:12, border:"1px solid #ddd", background:"white"}}>Annuler</button><button onClick={addContact} style={{flex:1, padding:14, borderRadius:12, background:"#008069", color:"white", border:"none", fontWeight:700}}>Ajouter</button></div>
          </div>
        </div>
      )}
      {showStatusAdd && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:99}}>
          <div style={{background:"white", padding:24, borderRadius:16, width:"90%", maxWidth:340}}><h3>Nouveau statut</h3><textarea value={statusText} onChange={e=>setStatusText(e.target.value)} placeholder="Quoi de neuf ?" style={{width:"100%", height:100, padding:12, borderRadius:12, border:"1px solid #ddd", fontSize:16}}/><div style={{display:"flex", gap:10, marginTop:12}}><button onClick={()=>setShowStatusAdd(false)} style={{flex:1, padding:12, borderRadius:12, border:"1px solid #ddd", background:"white"}}>Annuler</button><button onClick={addStatus} style={{flex:1, padding:12, borderRadius:12, background:"#008069", color:"white", border:"none"}}>Publier</button></div></div>
        </div>
      )}
    </div>
  );
}
