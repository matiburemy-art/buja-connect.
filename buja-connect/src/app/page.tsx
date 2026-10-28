'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Msg = { id: string, content: string, user_name: string, created_at: string }

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [isLogged, setIsLogged] = useState(false)
  const [replyTo, setReplyTo] = useState<Msg | null>(null)
  const [tab, setTab] = useState<'chats'|'status'|'comm'|'calls'>('chats')
  const [activeChat, setActiveChat] = useState<string | null>('bujagroup')
  const [showCall, setShowCall] = useState<{type:'voice'|'video', name:string}|null>(null)
  const [recording, setRecording] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const contacts = [
    { id: 'bujagroup', name: 'Bujumbura Groupe', last: 'Groupe officiel', avatar: '🌍', count: messages.length, isGroup: true },
    { id: '1', name: 'Maman', last: 'Salut mon fils ❤️', avatar: '👩', count: 2 },
    { id: '2', name: 'Keza Business', last: 'Produit disponible', avatar: '👨‍💼', count: 1 },
    { id: '3', name: 'Buja Market', last: 'Nouveau stock arrivé', avatar: '🛒', count: 5 },
  ]

  useEffect(() => {
    const n = localStorage.getItem('buja_name')
    const p = localStorage.getItem('buja_phone')
    if(n && p) { setName(n); setPhone(p); setIsLogged(true) }
    const load = async () => {
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(300)
      if(data) setMessages(data)
    }
    load()
    const ch = supabase.channel('wa-full').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, pl => {
      setMessages(prev => [...prev, pl.new as Msg])
    }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, activeChat])

  const login = () => {
    if(!name.trim() || !phone.trim()) return alert("Nom + numéro obligatoire")
    localStorage.setItem('buja_name', name)
    localStorage.setItem('buja_phone', phone)
    setIsLogged(true)
  }

  const send = async () => {
    if(!text.trim()) return
    let finalContent = text
    if(replyTo) finalContent = JSON.stringify({ reply: { name: replyTo.user_name, text: replyTo.content }, text })
    await supabase.from('messages').insert({ content: finalContent, user_name: name })
    setText(""); setReplyTo(null)
  }

  const parse = (c: string) => {
    try { const j = JSON.parse(c); if(j.reply) return j } catch {}
    return { text: c, reply: null as any }
  }

  if(!isLogged) {
    return (
      <main style={{ minHeight: '100vh', background: '#111b21', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ background: 'white', width: '370px', borderRadius: '2px', fontFamily: 'sans-serif' }}>
          <div style={{ background: '#008069', height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <div style={{ fontSize: '60px' }}>💬</div>
            <h2 style={{ fontWeight: 300, marginTop: '10px' }}>Bienvenue sur BUJA CONNECT</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <p style={{ fontSize: '13px', color: '#667781', textAlign: 'center' }}>Enregistre ton numéro comme sur WhatsApp. Ton nom et numéro seront visibles.</p>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ton nom complet" style={{ width: '100%', border: 'none', borderBottom: '2px solid #008069', padding: '14px 0', marginTop: '20px', outline: 'none', fontSize: '16px' }} />
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+257 79 123 456" style={{ width: '100%', border: 'none', borderBottom: '2px solid #008069', padding: '14px 0', marginTop: '12px', outline: 'none', fontSize: '16px' }} />
            <button onClick={login} style={{ width: '100%', background: '#008069', color: 'white', border: 'none', padding: '15px', borderRadius: '25px', marginTop: '30px', fontWeight: '700' }}>S'ENREGISTRER</button>
            <p style={{ fontSize: '11px', color: '#8696a0', textAlign: 'center', marginTop: '15px' }}>Ton numéro est enregistré localement, comme WhatsApp</p>
          </div>
        </div>
      </main>
    )
  }

  // CALL SCREEN
  if(showCall) {
    return (
      <main style={{ height: '100vh', background: '#202c33', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '60px 20px', color: 'white', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#8696a0', fontSize: '13px' }}>{showCall.type === 'voice' ? 'APPEL VOCAL' : 'APPEL VIDÉO'} • CHIFFRÉ</p>
          <h1 style={{ fontSize: '24px', marginTop: '20px' }}>{showCall.name}</h1>
          <p style={{ color: '#8696a0', marginTop: '6px' }}>Appel en cours...</p>
        </div>
        <div style={{ width: '120px', height: '120px', background: '#54656f', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '50px' }}>{showCall.type === 'voice' ? '👤' : '📹'}</div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button style={{ width: '55px', height: '55px', borderRadius: '50%', border: 'none', background: '#2a3942', fontSize: '22px' }}>🎙️</button>
          <button onClick={()=>setShowCall(null)} style={{ width: '55px', height: '55px', borderRadius: '50%', border: 'none', background: '#f15c6d', fontSize: '22px' }}>📞</button>
          <button style={{ width: '55px', height: '55px', borderRadius: '50%', border: 'none', background: '#2a3942', fontSize: '22px' }}>🔊</button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ height: '100vh', background: '#111b21', display: 'flex', justifyContent: 'center', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '480px', background: '#111b21', display: 'flex', flexDirection: 'column' }}>
        
        {/* TOP BAR */}
        {!activeChat || tab !== 'chats' ? (
          <div style={{ background: '#202c33', padding: '10px 16px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
            <div style={{ fontSize: '20px', fontWeight: '600' }}>BujaConnect</div>
            <div style={{ display: 'flex', gap: '18px', fontSize: '20px', color: '#aebac1' }}><span>🔍</span><span>⋮</span></div>
          </div>
        ) : null}

        {/* TABS */}
        {!activeChat && (
          <div style={{ background: '#202c33', display: 'flex', borderBottom: '1px solid #2a3942' }}>
            {[
              { k: 'chats', l: 'Disc.' },
              { k: 'status', l: 'Actus' },
              { k: 'comm', l: 'Commun.' },
              { k: 'calls', l: 'Appels' },
            ].map(t => (
              <button key={t.k} onClick={()=>setTab(t.k as any)} style={{ flex: 1, background: 'transparent', border: 'none', color: tab===t.k ? '#25d366' : '#8696a0', padding: '14px 0', fontWeight: tab===t.k ? '700' : '400', borderBottom: tab===t.k ? '3px solid #25d366' : '3px solid transparent', fontSize: '14px' }}>{t.l}</button>
            ))}
          </div>
        )}

        {/* CHAT LIST */}
        {!activeChat && tab === 'chats' && (
          <div style={{ flex: 1, overflowY: 'auto', background: '#111b21' }}>
            {contacts.map(c => (
              <div key={c.id} onClick={()=>setActiveChat(c.id)} style={{ display: 'flex', padding: '12px 16px', gap: '14px', borderBottom: '1px solid #202c33', cursor: 'pointer' }}>
                <div style={{ width: '49px', height: '49px', background: '#2a3942', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>{c.avatar}</div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ color: 'white', fontWeight: '500', fontSize: '17px' }}>{c.name}</div>
                    <div style={{ color: '#8696a0', fontSize: '12px' }}>10:45</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                    <div style={{ color: '#8696a0', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{c.id === 'bujagroup' ? `${messages.slice(-1)[0]?.content?.slice(0,30) || 'Bienvenue'} ` : c.last}</div>
                    {c.count > 0 && <div style={{ background: '#25d366', color: '#111b21', fontSize: '12px', minWidth: '20px', height: '20px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', padding: '0 6px' }}>{c.count}</div>}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ position: 'fixed', bottom: '80px', right: 'calc(50% - 480px/2 + 20px)', width: '55px', height: '55px', background: '#25d366', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: 'white' }}>💬</div>
          </div>
        )}

        {/* STATUS TAB */}
        {!activeChat && tab === 'status' && (
          <div style={{ flex: 1, background: '#111b21', padding: '16px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#2a3942', border: '3px dashed #25d366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➕</div>
              <div><div style={{ color: 'white' }}>Mon statut</div><div style={{ color: '#8696a0', fontSize: '13px' }}>Appuyez pour ajouter</div></div>
            </div>
            <div style={{ color: '#8696a0', fontSize: '13px', marginTop: '24px' }}>Mises à jour récentes</div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', border: '3px solid #25d366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👩</div>
              <div><div style={{ color: 'white' }}>Maman</div><div style={{ color: '#8696a0', fontSize: '13px' }}>il y a 5 min</div></div>
            </div>
          </div>
        )}

        {/* COMMUNITIES TAB */}
        {!activeChat && tab === 'comm' && (
          <div style={{ flex: 1, background: '#111b21', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
            <div style={{ width: '100px', height: '100px', background: '#2a3942', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '50px' }}>👥</div>
            <h3 style={{ color: 'white', marginTop: '20px' }}>Communautés Buja</h3>
            <p style={{ color: '#8696a0', fontSize: '14px', marginTop: '10px' }}>Bujumbura Market, Buja Jobs, Buja Events - tous ici</p>
          </div>
        )}

        {/* CALLS TAB */}
        {!activeChat && tab === 'calls' && (
          <div style={{ flex: 1, background: '#111b21', overflowY: 'auto' }}>
            {contacts.slice(0,3).map(c => (
              <div key={c.id} style={{ display: 'flex', padding: '12px 16px', gap: '14px', alignItems: 'center' }}>
                <div style={{ width: '45px', height: '45px', background: '#2a3942', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'white' }}>{c.name}</div>
                  <div style={{ color: '#8696a0', fontSize: '13px' }}>↙️ Aujourd'hui, 10:30</div>
                </div>
                <button onClick={()=>setShowCall({type:'voice', name:c.name})} style={{ background: 'transparent', border: 'none', fontSize: '20px' }}>📞</button>
                <button onClick={()=>setShowCall({type:'video', name:c.name})} style={{ background: 'transparent', border: 'none', fontSize: '20px' }}>📹</button>
              </div>
            ))}
          </div>
        )}

        {/* CHAT DETAIL - WHATSAPP STYLE */}
        {activeChat && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0b141a' }}>
            <div style={{ background: '#202c33', height: '59px', display: 'flex', alignItems: 'center', padding: '0 10px', justifyContent: 'space-between', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={()=>setActiveChat(null)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '22px' }}>←</button>
                <div style={{ width: '40px', height: '40px', background: '#54656f', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{contacts.find(x=>x.id===activeChat)?.avatar}</div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '16px' }}>{contacts.find(x=>x.id===activeChat)?.name}</div>
                  <div style={{ fontSize: '12px', color: '#8696a0' }}>en ligne</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '20px' }}>
                <button onClick={()=>setShowCall({type:'video', name: contacts.find(x=>x.id===activeChat)?.name || ''})} style={{ background: 'transparent', border: 'none', fontSize: '20px' }}>📹</button>
                <button onClick={()=>setShowCall({type:'voice', name: contacts.find(x=>x.id===activeChat)?.name || ''})} style={{ background: 'transparent', border: 'none', fontSize: '20px' }}>📞</button>
                <span>⋮</span>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: '#0b141a' }}>
              <div style={{ background: '#182533', color: '#8696a0', fontSize: '12px', padding: '6px 10px', borderRadius: '8px', width: 'fit-content', margin: '0 auto 12px', textAlign: 'center' }}>🔒 Messages chiffrés de bout en bout • Aujourd'hui</div>
              {messages.map(m => {
                const p = parse(m.content)
                const me = m.user_name === name
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start', marginBottom: '6px' }}>
                    <div onClick={()=>setReplyTo(m)} style={{ maxWidth: '78%', background: me ? '#005c4b' : '#202c33', color: 'white', borderRadius: me ? '8px 0 8px 8px' : '0 8px 8px 8px', padding: '6px 8px 6px 8px', position: 'relative', cursor: 'pointer' }}>
                      {!me && <div style={{ color: '#53bdeb', fontSize: '13px', fontWeight: '700' }}>{m.user_name}</div>}
                      {p.reply && (
                        <div style={{ background: me ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.3)', borderLeft: '4px solid #25d366', borderRadius: '4px', padding: '6px 8px', marginBottom: '6px' }}>
                          <div style={{ color: '#25d366', fontSize: '12px', fontWeight: '700' }}>{p.reply.name}</div>
                          <div style={{ fontSize: '13px', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.reply.text.slice(0,60)}</div>
                        </div>
                      )}
                      <div style={{ fontSize: '14.5px', lineHeight: '19px', whiteSpace: 'pre-wrap', paddingRight: '60px' }}>{p.text}</div>
                      <div style={{ float: 'right', display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px', marginLeft: '10px' }}>
                        <span style={{ fontSize: '11px', color: me ? '#8696a0' : '#8696a0' }}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {me && <span style={{ fontSize: '12px', color: '#53bdeb' }}>✓✓</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {replyTo && (
              <div style={{ background: '#202c33', borderLeft: '4px solid #25d366', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#25d366', fontSize: '13px', fontWeight: '700' }}>Répondre à {replyTo.user_name}</div>
                  <div style={{ color: '#8696a0', fontSize: '13px' }}>{parse(replyTo.content).text.slice(0,50)}</div>
                </div>
                <button onClick={()=>setReplyTo(null)} style={{ background: 'transparent', border: 'none', color: '#8696a0', fontSize: '20px' }}>✕</button>
              </div>
            )}

            <div style={{ background: '#202c33', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button style={{ background: 'transparent', border: 'none', fontSize: '24px' }}>😊</button>
              <button style={{ background: 'transparent', border: 'none', fontSize: '22px', color: '#8696a0' }}>📎</button>
              <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Message" style={{ flex: 1, background: '#2a3942', border: 'none', borderRadius: '20px', padding: '10px 16px', color: 'white', outline: 'none', fontSize: '15px' }} />
              {text.trim() ? (
                <button onClick={send} style={{ width: '45px', height: '45px', background: '#25d366', border: 'none', borderRadius: '50%', fontSize: '20px' }}>➤</button>
              ) : (
                <button onMouseDown={()=>setRecording(true)} onMouseUp={()=>setRecording(false)} style={{ width: '45px', height: '45px', background: '#25d366', border: 'none', borderRadius: '50%', fontSize: '20px' }}>{recording ? '🔴' : '🎤'}</button>
              )}
            </div>
          </div>
        )}

        {!activeChat && (
          <div style={{ height: '50px', background: '#202c33', display: 'flex', justifyContent: 'space-around', alignItems: 'center', borderTop: '1px solid #2a3942' }}>
            <span style={{ color: tab==='chats' ? '#25d366' : '#8696a0' }}>💬</span>
            <span style={{ color: tab==='status' ? '#25d366' : '#8696a0' }}>⭕</span>
            <span style={{ color: tab==='comm' ? '#25d366' : '#8696a0' }}>👥</span>
            <span style={{ color: tab==='calls' ? '#25d366' : '#8696a0' }}>📞</span>
          </div>
        )}
      </div>
    </main>
  )
}
