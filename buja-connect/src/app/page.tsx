'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Msg = { id: string, content: string, user_name: string, created_at: string }

const FLAGS = [
  { code: '🇧🇮', name: 'Burundi' },
  { code: '🇨🇩', name: 'Congo' },
  { code: '🇷🇼', name: 'Rwanda' },
  { code: '🇹🇿', name: 'Tanzania' },
  { code: '🇺🇬', name: 'Uganda' },
  { code: '🇰🇪', name: 'Kenya' },
  { code: '🇺🇸', name: 'USA' },
  { code: '🇫🇷', name: 'France' },
]

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState("")
  const [name, setName] = useState("Remy")
  const [flag, setFlag] = useState("🇧🇮")
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const savedName = localStorage.getItem('buja_name')
    if(savedName) setName(savedName)
    const load = async () => {
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(100)
      if(data) setMessages(data)
      setConnected(true)
    }
    load()
    const channel = supabase.channel('buja-global-v2').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      setMessages((prev) => [...prev, payload.new as Msg])
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const send = async () => {
    if(!text.trim()) return
    localStorage.setItem('buja_name', name)
    const { error } = await supabase.from('messages').insert({ content: text, user_name: `${name} ${flag}` })
    if(!error) setText("")
  }

  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, #1e293b 0%, #020617 100%)', color: 'white', display: 'flex', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui' }}>
      <div style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ textAlign: 'center', padding: '30px 0 10px' }}>
          <div style={{ fontSize: '48px' }}>🌍</div>
          <h1 style={{ fontSize: '36px', fontWeight: '900', letterSpacing: '-1px', margin: '10px 0', background: 'linear-gradient(90deg, #38bdf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BUJA CONNECT REMY</h1>
          <p style={{ opacity: 0.6, fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase' }}>{messages.length} messages • {connected ? '● LIVE' : '...'} • De Bujumbura au Monde</p>
          
          {/* SETTINGS */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '15px' }}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ton nom" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '8px 16px', color: 'white', outline: 'none', width: '120px' }} />
            <select value={flag} onChange={e=>setFlag(e.target.value)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '8px 12px', color: 'white', outline: 'none' }}>
              {FLAGS.map(f => <option key={f.code} value={f.code} style={{ background: '#020617' }}>{f.code} {f.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '20px', minHeight: '55vh', display: 'flex', flexDirection: 'column', gap: '12px', backdropFilter: 'blur(20px)' }}>
          {messages.map(m => (
            <div key={m.id} style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 16px', borderRadius: '16px', maxWidth: '85%', animation: 'fadeIn 0.3s' }}>
              <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px', fontWeight: '700' }}>{m.user_name} • {new Date(m.created_at).toLocaleTimeString('fr-BI', { hour: '2-digit', minute: '2-digit' })}</div>
              <div style={{ fontSize: '15px', lineHeight: '1.4' }}>{m.content}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', position: 'sticky', bottom: '20px', background: 'rgba(2,6,23,0.9)', padding: '12px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)' }}>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={`Message en tant que ${name} ${flag}...`} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'white', padding: '0 20px', fontSize: '16px' }} />
          <button onClick={send} style={{ background: 'linear-gradient(90deg, #38bdf8, #a78bfa)', border: 'none', color: 'black', fontWeight: '900', padding: '12px 28px', borderRadius: '100px', cursor: 'pointer' }}>→</button>
        </div>
      </div>
    </main>
  )
}