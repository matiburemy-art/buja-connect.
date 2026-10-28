"use client";
import { useState, useEffect } from "react";

type Contact = { id: string; name: string; lastMessage: string; time: string; };

export default function Page() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMsg, setNewMsg] = useState("");

  useEffect(() => {
    const s = localStorage.getItem("buja_contacts_v2");
    if (s) setContacts(JSON.parse(s));
  }, []);
  useEffect(() => {
    localStorage.setItem("buja_contacts_v2", JSON.stringify(contacts));
  }, [contacts]);

  const addContact = () => {
    if (!newName.trim()) return;
    const c: Contact = { id: Date.now().toString(), name: newName, lastMessage: newMsg || "Nouveau contact", time: new Date().toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}) };
    setContacts([c, ...contacts]);
    setNewName(""); setNewMsg(""); setShowAdd(false);
  };

  const selected = contacts.find(c => c.id === selectedId);
  const filtered = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{display:"flex", height:"100vh", fontFamily:"Segoe UI, Helvetica, Arial, sans-serif", background:"#f0f2f5"}}>
      {/* LEFT */}
      <div style={{width:"420px", background:"white", borderRight:"1px solid #e9edef", display:"flex", flexDirection:"column"}}>
        <div style={{height:"59px", padding:"0 16px", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <h1 style={{color:"#25D366", fontWeight:800, fontSize:"22px", margin:0}}>WhatsApp</h1>
          <button onClick={()=>setShowAdd(true)} style={{width:"36px", height:"36px", background:"#25D366", borderRadius:"50%", border:"none", color:"white", fontSize:"22px", cursor:"pointer"}}>+</button>
        </div>

        <div style={{padding:"8px 12px"}}>
          <div style={{background:"#f0f2f5", borderRadius:"8px", display:"flex", alignItems:"center", padding:"0 12px", height:"36px"}}>
            <span style={{color:"#54656f", marginRight:"16px"}}>⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher ou démarrer une discussion" style={{background:"transparent", border:"none", outline:"none", width:"100%", fontSize:"14px"}}/>
          </div>
        </div>

        <div style={{display:"flex", gap:"8px", padding:"8px 12px"}}>
          {["Toutes","Non lues","Favoris","Groupes"].map(f=>(
            <span key={f} style={{padding:"6px 12px", borderRadius:"20px", fontSize:"13px", background: f==="Toutes"?"#e7fce3":"#f0f2f5", color: f==="Toutes"?"#008069":"#54656f"}}>{f}</span>
          ))}
        </div>

        <div style={{flex:1, overflowY:"auto"}}>
          {filtered.length===0 ? (
            <div style={{textAlign:"center", marginTop:"80px", color:"#667781"}}>
              <div style={{fontSize:"60px"}}>💬</div>
              <p style={{marginTop:"12px"}}>Aucune discussion</p>
              <button onClick={()=>setShowAdd(true)} style={{marginTop:"16px", background:"#25D366", color:"white", border:"none", padding:"10px 20px", borderRadius:"24px", cursor:"pointer", fontWeight:600}}>+ Ajouter un contact</button>
            </div>
          ) : filtered.map(c=>(
            <div key={c.id} onClick={()=>setSelectedId(c.id)} style={{display:"flex", gap:"12px", padding:"12px", cursor:"pointer", background: selectedId===c.id?"#f0f2f5":"white"}}>
              <div style={{width:"49px", height:"49px", borderRadius:"50%", background:"#dfe5e7", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"bold", color:"#54656f"}}>{c.name[0].toUpperCase()}</div>
              <div style={{flex:1, borderBottom:"1px solid #e9edef", paddingBottom:"12px"}}>
                <div style={{display:"flex", justifyContent:"space-between"}}><b style={{color:"#111b21"}}>{c.name}</b><span style={{fontSize:"12px", color:"#667781"}}>{c.time}</span></div>
                <div style={{fontSize:"14px", color:"#667781", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{c.lastMessage}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{flex:1, background:"#efeae2", display:"flex", flexDirection:"column", position:"relative"}}>
        {selected ? (
          <>
            <div style={{height:"59px", background:"#f0f2f5", display:"flex", alignItems:"center", padding:"0 16px", gap:"12px"}}>
              <div style={{width:"40px", height:"40px", borderRadius:"50%", background:"#dfe5e7", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"bold"}}>{selected.name[0].toUpperCase()}</div>
              <b>{selected.name}</b>
            </div>
            <div style={{flex:1, padding:"20px"}}><span style={{background:"white", padding:"8px 12px", borderRadius:"8px", boxShadow:"0 1px 0.5px rgba(0,0,0,0.13)"}}>{selected.lastMessage}</span></div>
            <div style={{height:"62px", background:"#f0f2f5", display:"flex", alignItems:"center", padding:"0 16px"}}><input placeholder="Entrez un message" style={{flex:1, height:"42px", borderRadius:"8px", border:"none", padding:"0 12px", outline:"none"}}/></div>
          </>
        ) : (
          <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", color:"#41525d"}}>
            <h2 style={{fontSize:"32px", fontWeight:300}}>WhatsApp Web</h2>
            <p style={{color:"#667781", fontSize:"14px", marginTop:"8px"}}>Sélectionne une discussion ou ajoute un contact</p>
            <button onClick={()=>setShowAdd(true)} style={{marginTop:"24px", background:"#25D366", color:"white", border:"none", padding:"10px 24px", borderRadius:"24px", cursor:"pointer"}}>+ Nouveau contact</button>
          </div>
        )}
      </div>

      {showAdd && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50}}>
          <div style={{background:"white", borderRadius:"8px", padding:"24px", width:"360px"}}>
            <h3 style={{margin:"0 0 16px 0"}}>Ajouter contact</h3>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nom / Numéro" style={{width:"100%", border:"1px solid #e9edef", borderRadius:"8px", padding:"12px", marginBottom:"12px"}}/>
            <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} placeholder="Dernier message" style={{width:"100%", border:"1px solid #e9edef", borderRadius:"8px", padding:"12px", marginBottom:"16px"}}/>
            <div style={{display:"flex", justifyContent:"flex-end", gap:"8px"}}>
              <button onClick={()=>setShowAdd(false)} style={{padding:"8px 16px", border:"none", background:"transparent", color:"#667781", cursor:"pointer"}}>Annuler</button>
              <button onClick={addContact} style={{padding:"8px 20px", border:"none", background:"#25D366", color:"white", borderRadius:"24px", cursor:"pointer"}}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
