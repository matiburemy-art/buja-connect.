'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type Contact = { contact_phone: string, contact_name: string, avatar?: string }
type Message = { id: string, from_phone: string, from_name: string, to_phone: string, content: string, created_at: string }

export default function Page(){
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [isLogged, setIsLogged] = useState(false)
  const [tab, setTab] = useState<'chats'|'status'|'comm'|'calls'>('chats')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [active, setActive] = useState<string | null>(null) // phone of contact or 'GROUP'
  const [text, setText] = useState("")
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newCName, setNewCName] = useState("")
  const [newCPhone, setNewCPhone] = useState("")
  const [statusList, setStatusList] = useState<any[]>(()=>{ if(typeof window!=='undefined'){ return JSON.parse(localStorage.getItem('buja_status')||'[]')} return []})
  const [newStatus, setNewStatus] = useState("")
  const [callScreen, setCallScreen] = useState<{name:string, phone:string, type:'voice'|'video'}|null>(null)
  const [calls, setCalls] = useState<any[]>(()=>{ if(typeof window!=='undefined'){ return JSON.parse(localStorage.getItem('buja_calls')||'[]')} return []})
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    const n = localStorage.getItem('buja_name')
    const p = localStorage.getItem('buja_phone')
    if(n&&p){ setName(n); setPhone(p); setIsLogged(true) }
  },[])

  useEffect(()=>{
    if(!isLogged) return
    const load = async ()=>{
      const {data: c} = await supabase.from('buja_contacts').select('*').eq('owner_phone', phone)
      if(c) setContacts(c)
      const {data: m} = await supabase.from('buja_messages').select('*').or(`from_phone.eq.${phone},to_phone.eq.${phone},to_phone.eq.GROUP`).order('created_at',{ascending:true}).limit(500)
      if(m) setMessages(m)
    }
    load()
    const ch = supabase.channel('buja-global').on('postgres_changes',{event:'INSERT', schema:'public', table:'buja_messages'}, (pl)=>{
      const msg = pl.new as Message
      if(msg.from_phone===phone || msg.to_phone===phone || msg.to_phone==='GROUP') setMessages(prev=>[...prev, msg])
    }).subscribe()
    return ()=>{ supabase.removeChannel(ch) }
  },[isLogged, phone])

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages, active])

  const login = async ()=>{
    if(!name.trim() || !phone.trim()) return alert('Nom + Numéro requis')
    localStorage.setItem('buja_name', name)
    localStorage.setItem('buja_phone', phone)
    await supabase.from('buja_users').upsert({phone, name, avatar:'👤'})
    setIsLogged(true)
  }

  const addContact = async ()=>{
    if(!newCName || !newCPhone) return alert('Remplis nom + numéro')
    await supabase.from('buja_contacts').insert({owner_phone: phone, contact_phone: newCPhone, contact_name: newCName})
    setContacts([...contacts, {contact_phone: newCPhone, contact_name: newCName}])
    setShowAdd(false); setNewCName(""); setNewCPhone("")
  }

  const send = async ()=>{
    if(!text.trim() || !active) return
    let content = text
    if(replyTo) content = JSON.stringify({reply:{name: replyTo.from_name, text: JSON.parse(replyTo.content).text || replyTo.content}, text})
    const msg = {from_phone: phone, from_name: name, to_phone: active, content}
    await supabase.from('buja_messages').insert(msg)
    setText(""); setReplyTo(null)
  }

  const parse = (c:string)=>{
    try{ const j=JSON.parse(c); if(j.text) return j }catch{}
    return {text:c, reply:null}
  }

  const startCall = (ct: Contact, type:'voice'|'video')=>{
    const newCall = {name: ct.contact_name, phone: ct.contact_phone, type, time: new Date().toISOString()}
    const updated = [newCall, ...calls].slice(0,20)
    setCalls(updated); localStorage.setItem('buja_calls', JSON.stringify(updated))
    setCallScreen({name: ct.contact_name, phone: ct.contact_phone, type})
  }

  const addStatus = ()=>{
    if(!newStatus.trim()) return
    const s = {name, text: newStatus, time: new Date().toISOString()}
    const updated = [s, ...statusList]
    setStatusList(updated); localStorage.setItem('buja_status', JSON.stringify(updated)); setNewStatus("")
  }

  if(!isLogged) return (
    <main style={{minHeight:'100vh', background:'#111b21', display:'flex', justifyContent:'center', alignItems:'center', fontFamily:'sans-serif'}}>
      <div style={{background:'white', width:'360px', borderRadius:'4px', overflow:'hidden'}}>
        <div style={{background:'#008069', padding:'40px 20px', textAlign:'center', color:'white'}}>
          <div style={{fontSize:'50px'}}>💬</div><h2 style={{fontWeight:300, marginTop:'10px'}}>BUJA CONNECT</h2><p style={{fontSize:'13px', opacity:0.8, marginTop:'6px'}}>Application de discussion mondiale</p>
        </div>
        <div style={{padding:'24px'}}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ton nom" style={{width:'100%', border:'none', borderBottom:'2px solid #008069', padding:'12px 0', outline:'none', fontSize:'16px'}}/>
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Ex: +25779123456" style={{width:'100%', border:'none', borderBottom:'2px solid #008069', padding:'12px 0', marginTop:'12px', outline:'none', fontSize:'16px'}}/>
          <button onClick={login} style={{width:'100%', background:'#008069', color:'white', border:'none', padding:'14px', borderRadius:'25px', marginTop:'28px', fontWeight:'700', cursor:'pointer'}}>COMMENCER</button>
          <p style={{fontSize:'11px', color:'#8696a0', textAlign:'center', marginTop:'12px'}}>Ton numéro = ton identifiant mondial comme WhatsApp</p>
        </div>
      </div>
    </main>
  )

  if(callScreen) return (
    <main style={{height:'100vh', background:'#0b141a', color:'white', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between', padding:'60px 20px', fontFamily:'sans-serif'}}>
      <div style={{textAlign:'center'}}><p style={{color:'#8696a0', fontSize:'12px'}}>{callScreen.type==='voice'?'APPEL VOCAL':'APPEL VIDEO'} • CHIFFRE</p><h1 style={{marginTop:'20px'}}>{callScreen.name}</h1><p style={{color:'#8696a0'}}>{callScreen.phone}</p><p style={{marginTop:'10px', color:'#25d366'}}>● Appel en cours...</p></div>
      <div style={{width:'120px', height:'120px', background:'#2a3942', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'50px'}}>👤</div>
      <div style={{display:'flex', gap:'30px'}}><button style={{width:'55px', height:'55px', borderRadius:'50%', border:'none', background:'#2a3942'}}>🎙️</button><button onClick={()=>setCallScreen(null)} style={{width:'65px', height:'65px', borderRadius:'50%', border:'none', background:'#f15c6d', fontSize:'24px'}}>✕</button><button style={{width:'55px', height:'55px', borderRadius:'50%', border:'none', background:'#2a3942'}}>🔊</button></div>
    </main>
  )

  const activeContact = contacts.find(c=>c.contact_phone===active) || (active==='GROUP'?{contact_name:'Bujumbura Groupe Mondial', contact_phone:'GROUP'} as any : null)
  const filteredMsgs = messages.filter(m=> (active==='GROUP' && m.to_phone==='GROUP') || (m.from_phone===active && m.to_phone===phone) || (m.from_phone===phone && m.to_phone===active))

  return (
    <main style={{height:'100vh', background:'#111b21', display:'flex', justifyContent:'center', fontFamily:'Segoe UI, sans-serif'}}>
      <div style={{width:'100%', maxWidth:'480px', background:'#111b21', display:'flex', flexDirection:'column', position:'relative'}}>
        
        {/* HEADER */}
        {!active ? (
          <div style={{background:'#202c33', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', color:'white', height:'60px'}}>
            <div style={{fontSize:'20px', fontWeight:'700'}}>BujaConnect</div>
            <div style={{display:'flex', gap:'18px', fontSize:'20px'}}><span>🔍</span><span onClick={()=>{localStorage.clear(); location.reload()}} style={{cursor:'pointer'}}>⋮</span></div>
          </div>
        ) : (
          <div style={{background:'#202c33', height:'60px', display:'flex', alignItems:'center', padding:'0 10px', justifyContent:'space-between', color:'white'}}>
            <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
              <button onClick={()=>setActive(null)} style={{background:'transparent', border:'none', color:'white', fontSize:'22px', cursor:'pointer'}}>←</button>
              <div style={{width:'38px', height:'38px', background:'#54656f', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>👤</div>
              <div><div style={{fontWeight:'600', fontSize:'16px'}}>{activeContact?.contact_name}</div><div style={{fontSize:'12px', color:'#8696a0'}}>{active==='GROUP'?'groupe mondial • '+contacts.length+' membres':'en ligne'}</div></div>
            </div>
            <div style={{display:'flex', gap:'16px'}}>
              <button onClick={()=>activeContact&&setCallScreen({name:activeContact.contact_name, phone:activeContact.contact_phone, type:'video'})} style={{background:'transparent', border:'none', fontSize:'20px', cursor:'pointer'}}>📹</button>
              <button onClick={()=>activeContact&&setCallScreen({name:activeContact.contact_name, phone:activeContact.contact_phone, type:'voice'})} style={{background:'transparent', border:'none', fontSize:'20px', cursor:'pointer'}}>📞</button>
            </div>
          </div>
        )}

        {/* TABS */}
        {!active && (
          <div style={{background:'#202c33', display:'flex'}}>
            {[{k:'chats',l:'Disc.'},{k:'status',l:'Actus'},{k:'comm',l:'Commun.'},{k:'calls',l:'Appels'}].map(t=>(
              <button key={t.k} onClick={()=>setTab(t.k as any)} style={{flex:1, background:'transparent', border:'none', color: tab===t.k?'#25d366':'#8696a0', padding:'14px 0', fontWeight: tab===t.k?'700':'400', borderBottom: tab===t.k?'3px solid #25d366':'3px solid transparent', cursor:'pointer'}}>{t.l}</button>
            ))}
          </div>
        )}

        {/* CONTENT */}
        {!active && tab==='chats' && (
          <div style={{flex:1, overflowY:'auto'}}>
            <div onClick={()=>setActive('GROUP')} style={{display:'flex', padding:'12px 16px', gap:'14px', borderBottom:'1px solid #202c33', cursor:'pointer', background:'#182533'}}>
              <div style={{width:'49px', height:'49px', background:'#25d366', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px'}}>🌍</div>
              <div style={{flex:1}}><div style={{color:'white', fontWeight:'600'}}>Bujumbura Groupe Mondial</div><div style={{color:'#8696a0', fontSize:'14px'}}>{messages.filter(m=>m.to_phone==='GROUP').slice(-1)[0]? parse(messages.filter(m=>m.to_phone==='GROUP').slice(-1)[0].content).text.slice(0,30) : 'Appuyez pour discuter mondial'}...</div></div>
            </div>
            {contacts.map(c=>(
              <div key={c.contact_phone} onClick={()=>setActive(c.contact_phone)} style={{display:'flex', padding:'12px 16px', gap:'14px', borderBottom:'1px solid #202c33', cursor:'pointer'}}>
                <div style={{width:'49px', height:'49px', background:'#2a3942', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white'}}>👤</div>
                <div style={{flex:1, overflow:'hidden'}}><div style={{display:'flex', justifyContent:'space-between'}}><div style={{color:'white', fontWeight:'500'}}>{c.contact_name}</div><div style={{color:'#8696a0', fontSize:'11px'}}>{c.contact_phone}</div></div><div style={{color:'#8696a0', fontSize:'14px'}}>Appuyez pour chatter</div></div>
              </div>
            ))}
            {contacts.length===0 && <p style={{color:'#8696a0', textAlign:'center', marginTop:'40px', padding:'20px'}}>Aucun contact. Appuyez sur + pour ajouter vos amis de l'auditoire.</p>}
            <button onClick={()=>setShowAdd(true)} style={{position:'absolute', bottom:'20px', right:'20px', width:'56px', height:'56px', background:'#25d366', border:'none', borderRadius:'50%', fontSize:'30px', color:'white', cursor:'pointer', boxShadow:'0 4px 10px rgba(0,0,0,0.4)'}}>+</button>
          </div>
        )}

        {!active && tab==='status' && (
          <div style={{flex:1, background:'#111b21', overflowY:'auto', padding:'16px'}}>
            <div style={{background:'#202c33', borderRadius:'10px', padding:'12px', display:'flex', gap:'10px'}}>
              <input value={newStatus} onChange={e=>setNewStatus(e.target.value)} placeholder="Ton statut..." style={{flex:1, background:'#2a3942', border:'none', borderRadius:'20px', padding:'10px 16px', color:'white', outline:'none'}}/>
              <button onClick={addStatus} style={{background:'#25d366', border:'none', borderRadius:'20px', padding:'10px 16px', color:'white', fontWeight:'700', cursor:'pointer'}}>Poster</button>
            </div>
            <div style={{marginTop:'20px'}}><div style={{color:'#8696a0', fontSize:'13px'}}>Mises à jour</div>{statusList.map((s,i)=>(<div key={i} style={{display:'flex', gap:'12px', marginTop:'12px'}}><div style={{width:'50px', height:'50px', borderRadius:'50%', border:'3px solid #25d366', display:'flex', alignItems:'center', justifyContent:'center'}}>👤</div><div><div style={{color:'white'}}>{s.name}</div><div style={{color:'white', fontSize:'14px'}}>{s.text}</div><div style={{color:'#8696a0', fontSize:'11px'}}>{new Date(s.time).toLocaleTimeString()}</div></div></div>))}</div>
          </div>
        )}

        {!active && tab==='comm' && (
          <div style={{flex:1, background:'#111b21', padding:'20px', textAlign:'center', overflowY:'auto'}}>
            <div style={{background:'#202c33', borderRadius:'12px', padding:'20px', marginTop:'10px'}}><h3 style={{color:'white'}}>Buja Market</h3><p style={{color:'#8696a0', fontSize:'13px', marginTop:'6px'}}>Vente & achat à Bujumbura</p><button onClick={()=>setActive('GROUP')} style={{marginTop:'12px', background:'#25d366', border:'none', padding:'8px 20px', borderRadius:'20px', color:'white', cursor:'pointer'}}>Rejoindre</button></div>
            <div style={{background:'#202c33', borderRadius:'12px', padding:'20px', marginTop:'12px'}}><h3 style={{color:'white'}}>Buja Jobs</h3><p style={{color:'#8696a0', fontSize:'13px', marginTop:'6px'}}>Offres d'emploi Burundi</p><button onClick={()=>setActive('GROUP')} style={{marginTop:'12px', background:'#25d366', border:'none', padding:'8px 20px', borderRadius:'20px', color:'white', cursor:'pointer'}}>Rejoindre</button></div>
          </div>
        )}

        {!active && tab==='calls' && (
          <div style={{flex:1, background:'#111b21', overflowY:'auto'}}>
            <div style={{padding:'12px 16px', display:'flex', gap:'14px', borderBottom:'1px solid #202c33', cursor:'pointer'}}><div style={{width:'49px', height:'49px', background:'#25d366', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>🔗</div><div><div style={{color:'#25d366', fontWeight:'600'}}>Créer un lien d'appel</div><div style={{color:'#8696a0', fontSize:'13px'}}>Partagez pour rejoindre</div></div></div>
            {calls.map((c,i)=>(<div key={i} style={{display:'flex', padding:'12px 16px', gap:'14px', alignItems:'center'}}><div style={{width:'45px', height:'45px', background:'#2a3942', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>👤</div><div style={{flex:1}}><div style={{color:'white'}}>{c.name}</div><div style={{color:'#8696a0', fontSize:'13px'}}>{c.type==='voice'?'📞':'📹'} {new Date(c.time).toLocaleDateString()}</div></div><button onClick={()=>setCallScreen({name:c.name, phone:c.phone, type:c.type})} style={{background:'transparent', border:'none', fontSize:'20px', cursor:'pointer'}}>📞</button></div>))}
          </div>
        )}

        {/* CHAT DETAIL */}
        {active && (
          <div style={{flex:1, display:'flex', flexDirection:'column', background:'#0b141a'}}>
            <div style={{flex:1, overflowY:'auto', padding:'12px'}}>
              <div style={{background:'#182533', color:'#8696a0', fontSize:'11px', padding:'6px 10px', borderRadius:'8px', width:'fit-content', margin:'0 auto 10px'}}>🔒 Chiffrement bout en bout • {activeContact?.contact_name}</div>
              {filteredMsgs.map(m=>{
                const p=parse(m.content); const me=m.from_phone===phone
                return (
                  <div key={m.id} style={{display:'flex', justifyContent: me?'flex-end':'flex-start', marginBottom:'6px'}}>
                    <div onClick={()=>setReplyTo(m)} style={{maxWidth:'78%', background: me?'#005c4b':'#202c33', color:'white', borderRadius: me?'8px 0 8px 8px':'0 8px 8px 8px', padding:'6px 8px', cursor:'pointer'}}>
                      {p.reply && <div style={{background:'rgba(0,0,0,0.25)', borderLeft:'4px solid #25d366', borderRadius:'4px', padding:'5px 8px', marginBottom:'4px'}}><div style={{color:'#25d366', fontSize:'12px', fontWeight:'700'}}>{p.reply.name}</div><div style={{fontSize:'12px', opacity:0.8}}>{p.reply.text.slice(0,50)}</div></div>}
                      <div style={{fontSize:'14.5px', whiteSpace:'pre-wrap', paddingRight:'55px'}}>{p.text}</div>
                      <div style={{float:'right', display:'flex', gap:'4px', marginTop:'4px'}}><span style={{fontSize:'11px', color:'#8696a0'}}>{new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>{me&&<span style={{fontSize:'11px', color:'#53bdeb'}}>✓✓</span>}</div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef}/>
            </div>
            {replyTo && <div style={{background:'#202c33', borderLeft:'4px solid #25d366', padding:'8px 12px', display:'flex', justifyContent:'space-between'}}><div><div style={{color:'#25d366', fontSize:'13px', fontWeight:'700'}}>{replyTo.from_name}</div><div style={{color:'#8696a0', fontSize:'13px'}}>{parse(replyTo.content).text.slice(0,50)}</div></div><button onClick={()=>setReplyTo(null)} style={{background:'transparent', border:'none', color:'#8696a0'}}>✕</button></div>}
            <div style={{background:'#202c33', padding:'6px 8px', display:'flex', alignItems:'center', gap:'6px'}}><span style={{fontSize:'24px'}}>😊</span><span style={{fontSize:'22px', color:'#8696a0'}}>📎</span><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Message" style={{flex:1, background:'#2a3942', border:'none', borderRadius:'20px', padding:'10px 16px', color:'white', outline:'none'}}/><button onClick={send} style={{width:'45px', height:'45px', background:'#25d366', border:'none', borderRadius:'50%', fontSize:'18px', cursor:'pointer'}}>➤</button></div>
          </div>
        )}

        {/* MODAL AJOUT CONTACT */}
        {showAdd && (
          <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
            <div style={{background:'white', borderRadius:'8px', padding:'20px', width:'100%'}}>
              <h3 style={{color:'#111b21'}}>Ajouter un contact</h3>
              <p style={{fontSize:'12px', color:'#667781', marginTop:'4px'}}>Comme WhatsApp, avec numéro mondial</p>
              <input value={newCName} onChange={e=>setNewCName(e.target.value)} placeholder="Nom (ex: Jean Auditoire)" style={{width:'100%', border:'none', borderBottom:'2px solid #008069', padding:'12px 0', marginTop:'16px', outline:'none'}}/>
              <input value={newCPhone} onChange={e=>setNewCPhone(e.target.value)} placeholder="Numéro mondial ex: +25779..." style={{width:'100%', border:'none', borderBottom:'2px solid #008069', padding:'12px 0', marginTop:'10px', outline:'none'}}/>
              <div style={{display:'flex', gap:'10px', marginTop:'20px'}}><button onClick={()=>setShowAdd(false)} style={{flex:1, background:'#f0f2f5', border:'none', padding:'12px', borderRadius:'24px', cursor:'pointer'}}>Annuler</button><button onClick={addContact} style={{flex:1, background:'#008069', border:'none', padding:'12px', borderRadius:'24px', color:'white', fontWeight:'700', cursor:'pointer'}}>Ajouter</button></div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
