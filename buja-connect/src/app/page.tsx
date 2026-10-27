'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Msg = { id: string, content: string, user_name: string, created_at: string, reply_to?: string }

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [isLogged, setIsLogged] = useState(false)
  const [replyTo, setReplyTo] = useState<Msg | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const n = localStorage.getItem('buja_name')
    const p = localStorage.getItem('buja_phone')
    if(n && p) { setName(n); setPhone(p); setIsLogged(true) }
    const load = async () => {
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(200)
      if(data) setMessages(data)
    }
    load()
    const channel = supabase.channel('buja-reply').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => {
      setMessages(prev => [...prev, p.new as Msg])
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const login = () => {
    if(!name.trim() || !phone.trim()) return alert("Nom + numéro obligatoire")
    localStorage.setItem('buja_name', name)
    localStorage.setItem('buja_phone', phone)
    setIsLogged(true)
  }

  const send = async () => {
    if(!text.trim()) return
    let content = text
    if(replyTo) content = `↪️ Réponse à ${replyTo.user_name}: "${replyTo.content.slice(0,50)}"\n\n${text}`
    await supabase.from('messages').insert({ content, user_name: `${name} (${phone})` })
    setText(""); setReplyTo(null)
  }

  if(!isLogged) {
    return (
      <main style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, #1e293b 0%, #020617 100%)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'system-ui' }}>
        <div style={{ width: '100%', maxWidth: '400px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '40px 30px', backdropFilter: 'blur(20px)', textAlign: 'center' }}>
          <div style={{ fontSize: '48px' }}>🌍</div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', margin: '10px 0', background: 'linear-gradient(90deg, #38bdf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BUJA CONNECT</h1>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ton nom" style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '100px', padding: '14px 20px', color: 'white', outline: 'none', marginTop: '20px' }} />
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Numéro" type="tel" style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '100px', padding: '14px 20px', color: 'white', outline: 'none', marginTop: '12px' }} />
          <button onClick={login} style={{ width: '100%', background: 'linear-gradient(90deg, #38bdf8, #a78bfa)', border: 'none', color: 'black', fontWeight: '900', padding: '16px', borderRadius: '100px', cursor: 'pointer', marginTop: '20px' }}>ENTRER →</button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, #1e293b 0%, #020617 100%)', color: 'white', display: 'flex', justifyContent: 'center', padding: '10px', fontFamily: 'system-ui' }}>
      <div style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '15px 0' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '900', background: 'linear-gradient(90deg, #38bdf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BUJA CONNECT</h1>
          <p style={{ opacity: 0.5, fontSize: '12px' }}>{name} • {messages.length} msgs</p>
        </div>

        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', backdropFilter: 'blur(20px)' }}>
          {messages.map(m => (
            <div key={m.id} onClick={()=>setReplyTo(m)} style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 16px', borderRadius: '16px', maxWidth: '85%', cursor: 'pointer', border: replyTo?.id === m.id ? '1px solid #38bdf8' : '1px solid transparent' }}>
              <div style={{ fontSize: '11px', opacity: 0.6, fontWeight: '700', marginBottom: '4px' }}>{m.user_name}</div>
              <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>{m.content}</div>
              <div style={{ fontSize: '10px', opacity: 0.3, marginTop: '4px' }}>Clique pour répondre ↩️</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {replyTo && (
          <div style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '12px', padding: '10px 14px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700' }}>Répondre à {replyTo.user_name}</div><div style={{ fontSize: '13px', opacity: 0.8 }}>{replyTo.content.slice(0,60)}...</div></div>
            <button onClick={()=>setReplyTo(null)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', background: 'rgba(2,6,23,0.9)', padding: '10px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.15)' }}>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={replyTo ? `Répondre à ${replyTo.user_name}...` : "Écris un message..."} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'white', padding: '0 20px', fontSize: '16px' }} />
          <button onClick={send} style={{ background: 'linear-gradient(90deg, #38bdf8, #a78bfa)', border: 'none', color: 'black', fontWeight: '900', padding: '12px 24px', borderRadius: '100px', cursor: 'pointer' }}>→</button>
        </div>
      </div>
    </main>
  )
}
