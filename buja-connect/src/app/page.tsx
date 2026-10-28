"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null as any;

type UserAcc = { name: string; number: string; password: string; online: boolean; };
type Msg = { id: string; text?: string; audioUrl?: string; time: string; me: boolean; status: "sent" | "delivered" | "read"; };
type Contact = { id: string; name: string; number: string; online: boolean; exists: boolean; messages: Msg[]; };
type Status = { id: string; user_number: string; user_name: string; text?: string; image_url?: string; created_at: string; };

const normalize = (n: string) => n.replace(/\D/g, "").slice(-8);

export default function Page() {
  const [users, setUsers] = useState<UserAcc[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAcc | null>(null);
  const [authMode, setAuthMode] = useState<"login"|"signup">("login");
  const [aName, setAName] = useState(""); const [aNumber, setANumber] = useState(""); const [aPass, setAPass] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"disc" | "actu" | "comm" | "appels">("disc");
  const [search, setSearch] = useState(""); const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState(""); const [newNumber, setNewNumber] = useState("");
  const [inputText, setInputText] = useState("");
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [showStatusAdd, setShowStatusAdd] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [viewStatus, setViewStatus] = useState<Status | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadUsers = async () => {
    if(!supabase) { const u = localStorage.getItem("buja_users_backup"); if(u) setUsers(JSON.parse(u)); return; }
    const { data } = await supabase.from("users").select("*"); 
    if(data) setUsers(data as any);
  };
  const loadStatuses = async () => {
    if(!supabase) return;
    const { data } = await supabase.from("statuses").select("*").order("created_at", {ascending:false}); 
    if(data) setStatuses(data);
  };

  useEffect(() => { loadUsers(); loadStatuses(); const c = localStorage.getItem("buja_contacts_v7"); if(c) setContacts(JSON.parse(c)); const cu = localStorage.getItem("buja_current_v7"); if(cu) setCurrentUser(JSON.parse(cu)); }, []);
  useEffect(() => { localStorage.setItem("buja_contacts_v7", JSON.stringify(contacts)); }, [contacts]);
  useEffect(() => { endRef.current?.scrollIntoView({behavior:"smooth"}); }, [contacts, selectedId]);

  const handleSignup = async () => {
    if(!aName||!aNumber||!aPass) return alert("Remplis tout");
    if(!supabase){
      const nu = {name:aName, number:aNumber, password:aPass, online:true};
      const all = [...users, nu]; setUsers(all); localStorage.setItem("buja_users_backup", JSON.stringify(all));
      setCurrentUser(nu); localStorage.setItem("buja_current_v7", JSON.stringify(nu)); return;
    }
    const { error } = await supabase.from("users").insert([{name:aName, number:aNumber, password:aPass, online:true}]);
    if(error) return alert("Numéro déjà utilisé: "+error.message);
    const nu = {name:aName, number:aNumber, password:aPass, online:true}; setCurrentUser(nu); localStorage.setItem("buja_current_v7", JSON.stringify(nu)); loadUsers();
  };
  const handleLogin = async () => {
    if(!supabase){
      const found = users.find(u=>normalize(u.number)===normalize(aNumber) && u.password===aPass);
      if(!found) return alert("Faux - comptes locaux: "+users.map(u=>u.number).join(","));
      setCurrentUser(found); localStorage.setItem("buja_current_v7", JSON.stringify(found)); return;
    }
    const { data } = await supabase.from("users").select("*").eq("number", aNumber).eq("password", aPass).single();
    if(!data) return alert("Faux"); await supabase.from("users").update({online:true}).eq("number", aNumber);
    setCurrentUser(data as any); localStorage.setItem("buja_current_v7", JSON.stringify(data)); loadUsers();
  };
  const logout = async () => { 
    if(supabase && currentUser) await supabase.from("users").update({online:false}).eq("number", currentUser.number); 
    setCurrentUser(null); localStorage.removeItem("buja_current_v7"); 
  };

  const addContact = async () => {
    if(!newName||!newNumber) return; await loadUsers();
    const found = users.find(u=>normalize(u.number)===normalize(newNumber));
    const exists = !!found;
    const c: Contact = {id:Date.now().toString(), name:newName, number:newNumber, online:found?.online||false, exists, messages:[{id:"0", text: exists ? `✅ ${newName} est sur Buja Connect` : `❌ Pas sur Buja Connect`, time:"09:00", me:false, status:"read"}]};
    setContacts([c, ...contacts]); setShowAdd(false); setNewName(""); setNewNumber("");
  };
  const addStatus = async () => {
    if(!statusText.trim() || !currentUser) return;
    if(!supabase) return alert("Ajoute Supabase pour les statuts");
    await supabase.from("statuses").insert([{user_number:currentUser.number, user_name:currentUser.name, text:statusText}]);
    setStatusText(""); setShowStatusAdd(false); loadStatuses();
  };
  const sendText = () => {
    if(!inputText.trim()||!selected) return;
    const nm: Msg = {id:Date.now().toString(), text:inputText, time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}), me:true, status:selected.online?"delivered":"sent"};
    setContacts(prev=>prev.map(c=>c.id===selected.id?{...c, messages:[...c.messages, nm]}:c)); setInputText("");
  };
  const selected = contacts.find(c=>c.id===selectedId);
  const filtered = contacts.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()));

  if(!currentUser){
    return (
      <div style={{height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#111b21"}}>
        <div style={{background:"white", padding:28, borderRadius:16, width:360, fontFamily:"sans-serif"}}>
          <div style={{textAlign:"center", marginBottom:16}}><div style={{width:56, height:56, background:"#25D366", borderRadius:12, display:"inline-flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800, fontSize:24}}>B</div><h2 style={{margin:"8px 0"}}>Buja Connect</h2>{!supabase && <p style={{color:"#e11", fontSize:12, fontWeight:700}}>⚠️ Mode local - Ajoute tes clés Supabase dans .env.local</p>}</div>
          {authMode==="signup" && <input value={aName} onChange={e=>setAName(e.target.value)} placeholder="Nom" style={{width:"100%", padding:12, marginBottom:10, borderRadius:8, border:"1px solid #ddd"}}/>}
          <input value={aNumber} onChange={e=>setANumber(e.target.value)} placeholder="Numéro ex: 66465801" style={{width:"100%", padding:12, marginBottom:10, borderRadius:8, border:"1px solid #ddd"}}/>
          <input type="password" value={aPass} onChange={e=>setAPass(e.target.value)} placeholder="Mot de passe" style={{width:"100%", padding:12, marginBottom:12, borderRadius:8, border:"1px solid #ddd"}}/>
          <button onClick={authMode==="login"?handleLogin:handleSignup} style={{width:"100%", padding:12, background:"#25D366", color:"white", border:"none", borderRadius:8, fontWeight:700}}>{authMode==="login"?"Se connecter":"Créer compte"}</button>
          <p style={{textAlign:"center", fontSize:13, marginTop:12, cursor:"pointer", color:"#25D366"}} onClick={()=>setAuthMode(authMode==="login"?"signup":"login")}>{authMode==="login"?"Pas de compte ? S'inscrire":"Déjà un compte ? Se connecter"}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:"flex", height:"100vh", fontFamily:"sans-serif", background:"#fff"}}>
      <div style={{width:420, background:"white", display:"flex", flexDirection:"column", borderRight:"1px solid #e9edef"}}>
        <div style={{height:59, background:"#f0f2f5", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px"}}>
          <b style={{fontSize:19}}>Buja Connect {supabase ? "" : "(local)"}</b>
          <div style={{display:"flex", gap:12}}><span style={{cursor:"pointer"}} onClick={()=>setShowAdd(true)}>＋</span><span style={{cursor:"pointer", fontSize:12}} onClick={logout}>Déco</span></div>
        </div>
        {tab==="disc" && (
          <>
            <div style={{padding:8}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher" style={{width:"100%", background:"#f0f2f5", border:"none", borderRadius:8, padding:"10px 12px"}}/></div>
            <div style={{flex:1, overflowY:"auto"}}>
              {filtered.map(c=>(
                <div key={c.id} onClick={()=>setSelectedId(c.id)} style={{display:"flex", gap:12, padding:"12px 16px", cursor:"pointer", background:selectedId===c.id?"#f0f2f5":"white"}}>
                  <div style={{width:49, height:49, borderRadius:"50%", background:c.exists?"#d9fdd3":"#e9edef", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700}}>{c.name[0]}</div>
                  <div style={{flex:1, borderBottom:"1px solid #f5f5f5"}}><div style={{display:"flex", justifyContent:"space-between"}}><b style={{fontSize:15}}>{c.name}</b><span style={{fontSize:11}}>{c.messages[c.messages.length-1]?.time}</span></div><div style={{fontSize:13, color:c.exists?"#008069":"#e11", fontWeight:600}}>{c.number} • {c.exists?"Sur Buja":"Pas sur Buja"}</div><div style={{fontSize:13, color:"#667781", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:200}}>{c.messages[c.messages.length-1]?.text}</div></div>
                </div>
              ))}
              {filtered.length===0 && <p style={{textAlign:"center", marginTop:40, color:"#888"}}>Aucune discussion<br/><button onClick={()=>setShowAdd(true)} style={{marginTop:8, background:"#25D366", color:"white", border:"none", padding:"8px 16px", borderRadius:20}}>Nouveau contact</button></p>}
            </div>
          </>
        )}
        {tab==="actu" && (
          <div style={{flex:1, overflowY:"auto"}}>
            <div style={{padding:"16px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid #f0f2f5", cursor:"pointer"}} onClick={()=>setShowStatusAdd(true)}>
              <div style={{width:50, height:50, borderRadius:"50%", background:"#25D366", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:24}}>+</div>
              <div><b>Mon statut</b><div style={{fontSize:13, color:"#667781"}}>Appuie pour ajouter</div></div>
            </div>
            <div style={{padding:"12px 16px", fontSize:13, color:"#667781", fontWeight:600}}>ACTUALITÉS RÉCENTES</div>
            {statuses.map(s=>(
              <div key={s.id} onClick={()=>setViewStatus(s)} style={{display:"flex", gap:12, padding:"12px 16px", cursor:"pointer"}}>
                <div style={{width:49, height:49, borderRadius:"50%", border:"3px solid #25D366", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700}}>{s.user_name[0]}</div>
                <div><b style={{fontSize:15}}>{s.user_number===currentUser.number?"Mon statut":s.user_name}</b><div style={{fontSize:13, color:"#667781"}}>{new Date(s.created_at).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})} • {s.text?.slice(0,30)}</div></div>
              </div>
            ))}
            {!supabase && <p style={{textAlign:"center", marginTop:20, color:"#888", fontSize:13}}>Ajoute Supabase pour voir les statuts de YVES et autres</p>}
          </div>
        )}
        {tab==="comm" && (
          <div style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center"}}>
            <div style={{width:120, height:120, background:"#f0f2f5", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:40}}>👥</div>
            <h3>Communautés</h3><p style={{color:"#667781", fontSize:14}}>Bientôt disponible.</p>
          </div>
        )}
        {tab==="appels" && (
          <div style={{flex:1, overflowY:"auto"}}>
            <div style={{padding:"16px", display:"flex", alignItems:"center", gap:12}}><div style={{width:50, height:50, borderRadius:"50%", background:"#25D366", display:"flex", alignItems:"center", justifyContent:"center", color:"white"}}>📞</div><div><b style={{color:"#25D366"}}>Créer un lien d'appel</b><div style={{fontSize:13, color:"#667781"}}>Partage un lien</div></div></div>
            <div style={{textAlign:"center", marginTop:60, color:"#888"}}>Aucun appel récent</div>
          </div>
        )}
        <div style={{height:64, borderTop:"1px solid #e9edef", display:"flex", background:"white"}}>
          {[
            {id:"disc", label:"Disc.", icon:"💬"},
            {id:"actu", label:"Actus", icon:"⭕"},
            {id:"comm", label:"Commu.", icon:"👥"},
            {id:"appels", label:"Appels", icon:"📞"},
          ].map(t=>(
            <div key={t.id} onClick={()=>setTab(t.id as any)} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", color:tab===t.id?"#008069":"#667781"}}>
              <span style={{fontSize:20}}>{t.icon}</span><span style={{fontSize:11, fontWeight:tab===t.id?700:400, marginTop:2}}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{flex:1, background:"#efeae2", display:"flex", flexDirection:"column"}}>
        {selected ? (
          <>
            <div style={{height:59, background:"#f0f2f5", display:"flex", alignItems:"center", padding:"0 16px", gap:12}}><div style={{width:40, height:40, borderRadius:"50%", background:"#dfe5e7", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700}}>{selected.name[0]}</div><div><b>{selected.name}</b><div style={{fontSize:12, color:"#667781"}}>{selected.number} • {selected.exists?(selected.online?"en ligne":"hors ligne"):"Pas sur Buja"}</div></div></div>
            <div style={{flex:1, padding:16, overflowY:"auto", display:"flex", flexDirection:"column", gap:8}}>
              {selected.messages.map(m=>(<div key={m.id} style={{alignSelf:m.me?"flex-end":"flex-start", background:m.me?"#d9fdd3":"white", padding:"8px 12px", borderRadius:8, maxWidth:"65%"}}><span style={{fontSize:14}}>{m.text}</span><div style={{fontSize:10, textAlign:"right", color:"#667781", marginTop:4}}>{m.time} {m.me && (m.status==="sent"?"✓":"✓✓")}</div></div>))}<div ref={endRef}/>
            </div>
            <div style={{height:62, background:"#f0f2f5", display:"flex", alignItems:"center", padding:"0 12px", gap:8}}><input value={inputText} onChange={e=>setInputText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendText()} placeholder={selected.exists?"Message":"Non enregistré"} disabled={!selected.exists} style={{flex:1, height:42, borderRadius:8, border:"none", padding:"0 12px"}}/><button onClick={sendText} style={{width:42, height:42, borderRadius:"50%", background:"#25D366", color:"white", border:"none"}}>➤</button></div>
          </>
        ) : (<div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column"}}><div style={{width:64, height:64, background:"#25D366", borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800, fontSize:28}}>B</div><p style={{color:"#667781", marginTop:12}}>Sélectionne une discussion</p></div>)}
      </div>
      {showAdd && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:99}}>
          <div style={{background:"white", padding:24, borderRadius:12, width:340}}><h3 style={{marginTop:0}}>Nouveau contact</h3><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nom ex: YVES" style={{width:"100%", padding:12, marginBottom:10, borderRadius:8, border:"1px solid #ddd"}}/><input value={newNumber} onChange={e=>setNewNumber(e.target.value)} placeholder="Numéro ex: 66465801" style={{width:"100%", padding:12, marginBottom:12, borderRadius:8, border:"1px solid #ddd"}}/><p style={{fontSize:11, color:"#888"}}>{supabase ? `Supabase: ${users.length} comptes` : `Local: ${users.length} comptes - Ajoute Supabase pour voir YVES partout`}</p><div style={{display:"flex", justifyContent:"flex-end", gap:8}}><button onClick={()=>setShowAdd(false)} style={{border:"none", background:"transparent"}}>Annuler</button><button onClick={addContact} style={{background:"#25D366", color:"white", border:"none", padding:"8px 16px", borderRadius:20}}>Ajouter</button></div></div>
        </div>
      )}
      {showStatusAdd && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:99}}>
          <div style={{background:"white", padding:24, borderRadius:12, width:340}}><h3>Nouveau statut</h3><textarea value={statusText} onChange={e=>setStatusText(e.target.value)} placeholder="Quoi de neuf ?" style={{width:"100%", height:80, padding:12, borderRadius:8, border:"1px solid #ddd"}}/><div style={{display:"flex", justifyContent:"flex-end", gap:8, marginTop:12}}><button onClick={()=>setShowStatusAdd(false)} style={{border:"none", background:"transparent"}}>Annuler</button><button onClick={addStatus} style={{background:"#25D366", color:"white", border:"none", padding:"8px 16px", borderRadius:20}}>Publier</button></div></div>
        </div>
      )}
      {viewStatus && (
        <div style={{position:"fixed", inset:0, background:"black", display:"flex", flexDirection:"column", zIndex:100, color:"white"}}>
          <div style={{height:60, padding:"0 16px", display:"flex", alignItems:"center", justifyContent:"space-between"}}><div style={{display:"flex", alignItems:"center", gap:10}}><div style={{width:40, height:40, borderRadius:"50%", background:"#25D366", display:"flex", alignItems:"center", justifyContent:"center"}}>{viewStatus.user_name[0]}</div><div><b>{viewStatus.user_name}</b><div style={{fontSize:12, opacity:0.7}}>{new Date(viewStatus.created_at).toLocaleString()}</div></div></div><button onClick={()=>setViewStatus(null)} style={{background:"transparent", border:"none", color:"white", fontSize:24}}>✕</button></div>
          <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontSize:24, textAlign:"center"}}>{viewStatus.text}</div>
        </div>
      )}
    </div>
  );
}
