'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type Contact = { contact_phone: string, contact_name: string, isOnBuja?: boolean, last_seen?: string, realName?: string }
type Message = { id: string, from_phone: string, from_name: string, to_phone: string, content: string, created_at: string }

export default function Page(){
  const [myPhone, setMyPhone] = useState(""); const [myName, setMyName] = useState("")
  const [nameInput, setNameInput] = useState(""); const [phoneInput, setPhoneInput] = useState("")
  const [isLogged, setIsLogged] = useState(false); const [tab, setTab] = useState('chats')
  const [contacts, setContacts] = useState<Contact[]>([]); const [messages, setMessages] = useState<Message[]>([])
  const [active, setActive] = useState<string | null>(null); const [text, setText] = useState("")
  const [showAdd, setShowAdd] = useState(false); const [newName, setNewName] = useState(""); const [newPhone, setNewPhone] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null); const fileRef = useRef<HTMLInputElement>(null)

  useEffect(()=>{
    const p=localStorage.getItem('buja_phone'); const n=localStorage.getItem('buja_name')
    if(p&&n){ setMyPhone(p); setMyName(n); setIsLogged(true) }
  },[])

  useEffect(()=>{
    if(!isLogged) return
    const load = async ()=>{
      const {data: c} = await supabase.from('buja_contacts').select('*').eq('owner_phone', myPhone)
      if(c){
        const enriched = await Promise.all(c.map(async (ct:any)=>{
          const {data: u} = await supabase.from('buja_users').select('*').eq('phone', ct.contact_phone).single()
          return { contact_phone: ct.contact_phone, contact_name: ct.contact_name, isOnBuja: !!u, last_seen: u?.last_seen, realName: u?.name }
        }))
        setContacts(enriched)
      }
      const {data: m} = await supabase.from('buja_messages').select('*').order('created_at',{ascending:true}).limit(500)
      if(m) setMessages(m.filter(x=> x.from_phone===myPhone || x.to_phone===myPhone))
    }
    load()
    const ch = supabase.channel('buja-num').on('postgres_changes',{event:'INSERT', schema:'public', table:'buja_messages'}, pl=>{
      const msg=pl.new as Message; if(msg.from_phone===myPhone||msg.to_phone===myPhone) setMessages(p=>[...p, msg])
    }).subscribe()
    const iv=setInterval(async()=>{ await supabase.from('buja_users').update({last_seen: new Date().toISOString()}).eq('phone', myPhone) },30000)
    return ()=>{ supabase.removeChannel(ch); clearInterval(iv) }
  },[isLogged, myPhone])

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages, active])

  const login = async ()=>{
    if(!nameInput.trim()||!phoneInput.trim()) return alert('Nom + Numéro')
    const phone = phoneInput.trim().replace(/\s/g,'')
    await supabase.from('buja_users').upsert({phone, name: nameInput.trim(), last_seen: new Date().toISOString()})
    localStorage.setItem('buja_phone', phone); localStorage.setItem('buja_name', nameInput.trim())
    setMyPhone(phone); setMyName(nameInput.trim()); setIsLogged(true)
  }

  const addContact = async ()=>{
    if(!newName.trim()||!newPhone.trim()) return alert('Nom + Numéro')
    const phone = newPhone.trim().replace(/\s/g,'')
    if(phone===myPhone) return alert('C\'est toi même')
    const {data: exist} = await supabase.from('buja_contacts').select('*').eq('owner_phone', myPhone).eq('contact_phone', phone).single()
    if(exist) return alert('Déjà ajouté')
    // VERIFIE PAR NUMERO si il est sur BujaConnect
    const {data: user} = await supabase.from('buja_users').select('*').eq('phone', phone).single()
    await supabase.from('buja_contacts').insert({owner_phone: myPhone, contact_phone: phone, contact_name: newName.trim()})
    setContacts([...contacts, {contact_phone: phone, contact_name: newName.trim(), isOnBuja: !!user, last_seen: user?.last_seen, realName: user?.name}])
    setShowAdd(false); setNewName(""); setNewPhone("")
  }

  const send = async (override?: string)=>{
    const c=override||text; if(!c.trim()||!active) return
    await supabase.from('buja_messages').insert({from_phone: myPhone, from_name: myName, to_phone: active, content: c})
    setText("")
  }
  const handlePhoto = (e:any)=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>send(r.result as string); r.readAsDataURL(f) }

  const isOnline = (ls?: string)=> ls && (Date.now() - new Date(ls).getTime() < 120000)

  if(!isLogged) return (
    <main style={{minHeight:'100vh', background:'#111b21', display:'flex', justifyContent:'center', alignItems:'center', fontFamily:'sans-serif'}}>
      <div style={{background:'white', width:'360px', borderRadius:'4px', overflow:'hidden'}}>
        <div style={{background:'#008069', padding:'35px', textAlign:'center', color:'white'}}><div style={{fontSize:'50px'}}>💬</div><h2 style={{fontWeight:300}}>BUJA CONNECT</h2><p style={{fontSize:'12px', marginTop:'6px', opacity:0.9}}>Identification par NUMÉRO comme WhatsApp</p></div>
        <div style={{padding:'22px'}}><input value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="Ton nom" style={{width:'100%', border:'none', borderBottom:'2px solid #008069', padding:'12px 0', outline:'none', fontSize:'16px'}}/><input value={phoneInput} onChange={e=>setPhoneInput(e.target.value)} placeholder="Ton numéro ex: +25779..." style={{width:'100%', border:'none', borderBottom:'2px solid #008069', padding:'12px 0', marginTop:'12px', outline:'none', fontSize:'16px'}}/><button onClick={login} style={{width:'100%', background:'#008069', color:'white', border:'none', padding:'14px', borderRadius:'25px', marginTop:'22px', fontWeight:'700', cursor:'pointer'}}>CRÉER COMPTE</button><p style={{fontSize:'11px', color:'#8696a0', textAlign:'center', marginTop:'10px'}}>Ton numéro = ton identifiant mondial</p></div>
      </div>
    </main>
  )

  const activeContact = contacts.find(c=>c.contact_phone===active)
  const filtered = messages.filter(m=> (m.from_phone===active && m.to_phone===myPhone) || (m.from_phone===myPhone && m.to_phone===active))

  return (
    <main style={{height:'100vh', background:'#111b21', display:'flex', justifyContent:'center', fontFamily:'Segoe UI, sans-serif'}}>
      <div style={{width:'100%', maxWidth:'480px', background:'#111b21', display:'flex', flexDirection:'column', position:'relative'}}>
        {!active ? <div style={{background:'#202c33', height:'60px', padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', color:'white'}}><div style={{fontWeight:'700'}}>BujaConnect</div><div style={{fontSize:'12px', color:'#25d366'}}>{myName} • {myPhone}</div></div>
        : <div style={{background:'#202c33', height:'60px', display:'flex', alignItems:'center', padding:'0 10px', justifyContent:'space-between', color:'white'}}><div style={{display:'flex', alignItems:'center', gap:'8px'}}><button onClick={()=>setActive(null)} style={{background:'transparent', border:'none', color:'white', fontSize:'22px', cursor:'pointer'}}>←</button><div style={{width:'38px', height:'38px', background:'#54656f', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>👤</div><div><div style={{fontWeight:'600'}}>{activeContact?.contact_name}</div><div style={{fontSize:'11px', color:'#8696a0'}}>{activeContact?.contact_phone} {activeContact?.realName?`• vrai nom: ${activeContact.realName}`:''}</div><div style={{fontSize:'12px', color: isOnline(activeContact?.last_seen)?'#25d366':'#8696a0'}}>{activeContact?.isOnBuja ? (isOnline(activeContact?.last_seen)?'en ligne':'hors ligne') : 'Pas sur BujaConnect'}</div></div></div><div>📞 📹</div></div>}

        {!active && (
          <div style={{flex:1, overflowY:'auto'}}>
            {contacts.map(c=>(
              <div key={c.contact_phone} style={{display:'flex', padding:'12px 16px', gap:'14px', borderBottom:'1px solid #202c33'}}>
                <div style={{width:'49px', height:'49px', background:'#2a3942', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>👤</div>
                <div style={{flex:1}}><div style={{display:'flex', justifyContent:'space-between'}}><div style={{color:'white', fontWeight:'500'}}>{c.contact_name}</div><div style={{color:'#8696a0', fontSize:'11px'}}>{c.contact_phone}</div></div>
                <div style={{display:'flex', justifyContent:'space-between', marginTop:'4px', alignItems:'center'}}><div style={{fontSize:'12px', color: c.isOnBuja?'#8696a0':'#f15c6d'}}>{c.isOnBuja ? (c.realName?`S'est inscrit: ${c.realName}`:`Sur BujaConnect`) : 'Pas encore sur BujaConnect'}</div>{c.isOnBuja ? <button onClick={()=>setActive(c.contact_phone)} style={{background:'#25d366', border:'none', borderRadius:'14px', padding:'6px 14px', color:'white', fontSize:'12px', fontWeight:'700', cursor:'pointer'}}>Discuter</button> : <button onClick={()=>{ const msg=`Rejoins BUJA CONNECT ${window.location.origin} mon numéro ${myPhone}`; window.open(`https://wa.me/${c.contact_phone.replace('+','')}?text=${encodeURIComponent(msg)}`,'_blank')}} style={{background:'#54656f', border:'none', borderRadius:'14px', padding:'6px 14px', color:'white', fontSize:'12px', cursor:'pointer'}}>INVITER</button>}</div></div>
              </div>
            ))}
            {contacts.length===0 && <div style={{textAlign:'center', marginTop:'80px', padding:'20px'}}><div style={{fontSize:'50px'}}>👥</div><p style={{color:'white', marginTop:'10px', fontWeight:'600'}}>Aucun contact</p><p style={{color:'#8696a0', fontSize:'13px', marginTop:'6px'}}>Clique + → Ajoute NOM + NUMÉRO<br/>C'est le NUMÉRO qui identifie, pas le nom.<br/>Tu peux l'appeler comme tu veux chez toi.</p></div>}
            <button onClick={()=>setShowAdd(true)} style={{position:'absolute', bottom:'20px', right:'20px', width:'56px', height:'56px', background:'#25d366', border:'none', borderRadius:'50%', fontSize:'28px', color:'white', cursor:'pointer', boxShadow:'0 4px 10px rgba(0,0,0,0.5)'}}>+</button>
          </div>
        )}

        {active && (
          <div style={{flex:1, display:'flex', flexDirection:'column', background:'#0b141a'}}>
            <div style={{flex:1, overflowY:'auto', padding:'12px'}}>{filtered.map(m=>{ const me=m.from_phone===myPhone; const isImg=m.content.startsWith('data:image'); return (<div key={m.id} style={{display:'flex', justifyContent:me?'flex-end':'flex-start', marginBottom:'8px'}}><div style={{maxWidth:'78%', background:me?'#005c4b':'#202c33', color:'white', borderRadius:me?'8px 0 8px 8px':'0 8px 8px 8px', padding:'6px 8px'}}>{isImg?<img src={m.content} style={{maxWidth:'200px', borderRadius:'6px'}}/>:<div style={{fontSize:'14.5px', whiteSpace:'pre-wrap', paddingRight:'45px'}}>{m.content}</div>}<div style={{float:'right', display:'flex', gap:'4px', marginTop:'4px'}}><span style={{fontSize:'11px', color:'#8696a0'}}>{new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>{me&&<span style={{fontSize:'11px', color:'#53bdeb'}}>✓✓</span>}</div></div></div>) })}<div ref={bottomRef}/></div>
            <div style={{background:'#202c33', padding:'6px 8px', display:'flex', alignItems:'center', gap:'6px'}}><input type="file" ref={fileRef} onChange={handlePhoto} accept="image/*" style={{display:'none'}}/><button onClick={()=>fileRef.current?.click()} style={{background:'transparent', border:'none', fontSize:'22px', cursor:'pointer'}}>📎</button><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Message" style={{flex:1, background:'#2a3942', border:'none', borderRadius:'20px', padding:'10px 16px', color:'white', outline:'none'}}/><button onClick={()=>send()} style={{width:'45px', height:'45px', background:'#25d366', border:'none', borderRadius:'50%', cursor:'pointer'}}>➤</button></div>
          </div>
        )}

        {showAdd && (
          <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
            <div style={{background:'white', borderRadius:'8px', padding:'20px', width:'100%'}}>
              <h3 style={{color:'#111b21'}}>Nouveau contact</h3><p style={{fontSize:'12px', color:'#667781', marginTop:'4px'}}>Le NUMÉRO identifie la personne. Le NOM c'est juste comment TU l'appelles chez toi.</p>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Comment tu l'appelles? Ex: Jean" style={{width:'100%', border:'none', borderBottom:'2px solid #008069', padding:'12px 0', marginTop:'16px', outline:'none', fontSize:'15px'}}/>
              <input value={newPhone} onChange={e=>setNewPhone(e.target.value)} placeholder="Son NUMÉRO ex: +25779XXXXXX" style={{width:'100%', border:'none', borderBottom:'2px solid #008069', padding:'12px 0', marginTop:'12px', outline:'none', fontSize:'15px'}}/>
              <div style={{display:'flex', gap:'10px', marginTop:'20px'}}><button onClick={()=>setShowAdd(false)} style={{flex:1, background:'#f0f2f5', border:'none', padding:'12px', borderRadius:'24px', cursor:'pointer'}}>Annuler</button><button onClick={addContact} style={{flex:1, background:'#008069', border:'none', padding:'12px', borderRadius:'24px', color:'white', fontWeight:'700', cursor:'pointer'}}>Ajouter</button></div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
