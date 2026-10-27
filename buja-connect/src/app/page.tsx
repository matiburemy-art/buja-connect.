'use client'
import { useEffect, useState } from 'react'
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
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const n = localStorage.getItem('buja_name')
    const p = localStorage.getItem('buja_phone')
    if(n && p) { setName(n); setPhone(p); setIsLogged(true) }
    
    const load = async () => {
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(100)
      if(data) setMessages(data)
      setConnected(true)
    }
    load()
    const channel = supabase.channel('buja-final-both').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => {
      setMessages(prev => [...prev, p.new as Msg])
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const login = () => {
    if(!name.trim()) return alert("Entre ton nom !")
    if(!phone.trim() || phone.length < 8) return alert("Entre un bon numéro !")
    localStorage.setItem('buja_name', name)
    localStorage.setItem('buja_phone', phone)
    setIsLogged(true)
  }

  const send = async () => {
    if(!text.trim()) return
    await supabase.from('messages').insert({ content: text, user_name: `${name} (${phone})` })
    setText("")
  }

  if(!isLogged) {
    return (
      <main style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, #1e293b 0%, #020617 100%)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'system-ui' }}>
        <div style={{ width: '100%', maxWidth: '400px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '40px 30px', backdropFilter: 'blur(20px)', textAlign: 'center' }}>
          <div style={{ fontSize: '48px' }}>🌍</div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '10px 0', background: 'linear-gradient(90deg, #38bdf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BUJA CONNECT</h1>
          <p style={{ opacity: 0.6, fontSize: '12px', letterSpacing: '2px', marginBottom: '30px' }}>De Bujumbura au Monde</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ton nom... Ex: Remy" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '100px', padding: '16px 20px', color: 'white', outline: 'none', fontSize: '16px' }} />
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Ton numéro... Ex: 79123456" type="tel" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '100px', padding: '16px 20px', color: 'white', outline: 'none', fontSize: '16px' }} />
            <button onClick={login} style={{ background: 'linear-gradient(90deg, #38bdf8, #a78bfa)', border: 'none', color: 'black', fontWeight: '900', padding: '16px', borderRadius: '100px', cursor: 'pointer', marginTop: '10px' }}>ENTRER →</button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, #1e293b 0%, #020617 100%)', color: 'white', display: 'flex', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui' }}>
      <div style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '900', background: 'linear-gradient(90deg, #38bdf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BUJA CONNECT REMY</h1>
          <p style={{ opacity: 0.6, fontSize: '13px' }}>{name} • {phone} • {messages.length} msgs • {connected ? '● LIVE' : '...'} <button onClick={()=>{localStorage.clear(); setIsLogged(false)}} style={{ marginLeft: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '100px', color: 'white', fontSize: '10px', padding: '2px 8px', cursor: 'pointer' }}>Quitter</button></p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '20px', minHeight: '55vh', display: 'flex', flexDirection: 'column', gap: '12px', backdropFilter: 'blur(20px)' }}>
          {messages.map(m => (
            <div key={m.id} style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 16px', borderRadius: '16px', maxWidth: '85%' }}>
              <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px', fontWeight: '700' }}>{m.user_name}</div>
              <div style={{ fontSize: '15px' }}>{m.content}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px', position: 'sticky', bottom: '20px', background: 'rgba(2,6,23,0.9)', padding: '12px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)' }}>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={`Message en tant que ${name}...`} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'white', padding: '0 20px', fontSize: '16px' }} />
          <button onClick={send} style={{ background: 'linear-gradient(90deg, #38bdf8, #a78bfa)', border: 'none', color: 'black', fontWeight: '900', padding: '12px 28px', borderRadius: '100px', cursor: 'pointer' }}>→</button>
        </div>
      </div>
    </main>
  )
}
