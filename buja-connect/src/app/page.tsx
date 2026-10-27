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
  { code: '🇨🇩', name: 'Congo RDC' },
  { code: '🇷🇼', name: 'Rwanda' },
  { code: '🇹🇿', name: 'Tanzania' },
  { code: '🇺🇬', name: 'Uganda' },
  { code: '🇰🇪', name: 'Kenya' },
  { code: '🇪🇹', name: 'Ethiopie' },
  { code: '🇿🇦', name: 'Afrique du Sud' },
  { code: '🇳🇬', name: 'Nigeria' },
  { code: '🇨🇲', name: 'Cameroun' },
  { code: '🇸🇳', name: 'Senegal' },
  { code: '🇲🇦', name: 'Maroc' },
  { code: '🇩🇿', name: 'Algerie' },
  { code: '🇪🇬', name: 'Egypte' },
  { code: '🇺🇸', name: 'USA' },
  { code: '🇨🇦', name: 'Canada' },
  { code: '🇫🇷', name: 'France' },
  { code: '🇧🇪', name: 'Belgique' },
  { code: '🇬🇧', name: 'UK' },
  { code: '🇩🇪', name: 'Allemagne' },
  { code: '🇮🇹', name: 'Italie' },
  { code: '🇪🇸', name: 'Espagne' },
  { code: '🇵🇹', name: 'Portugal' },
  { code: '🇧🇷', name: 'Bresil' },
  { code: '🇦🇪', name: 'Dubai' },
  { code: '🇹🇷', name: 'Turquie' },
  { code: '🇨🇳', name: 'Chine' },
  { code: '🇯🇵', name: 'Japon' },
  { code: '🇮🇳', name: 'Inde' },
]

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState("")
  const [name, setName] = useState("")
  const [flag, setFlag] = useState("🇧🇮")
  const [connected, setConnected] = useState(false)
  const [isLogged, setIsLogged] = useState(false)

  useEffect(() => {
    const savedName = localStorage.getItem('buja_name')
    const savedFlag = localStorage.getItem('buja_flag')
    const savedLogin = localStorage.getItem('buja_logged')
    if(savedName) setName(savedName)
    if(savedFlag) setFlag(savedFlag)
    if(savedLogin === 'true' && savedName) setIsLogged(true)

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

  const login = () => {
    if(!name.trim()) return alert("Entre ton nom !")
    localStorage.setItem('buja_name', name)
    localStorage.setItem('buja_flag', flag)
    localStorage.setItem('buja_logged', 'true')
    setIsLogged(true)
  }

  const send = async () => {
    if(!text.trim()) return
    const { error } = await supabase.from('messages').insert({ content: text, user_name: `${name} ${flag}` })
    if(!error) setText("")
  }

  // PAGE LOGIN - MEME DESIGN
  if(!isLogged) {
    return (
      <main style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, #1e293b 0%, #020617 100%)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'system-ui' }}>
        <div style={{ width: '100%', maxWidth: '400px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '40px 30px', backdropFilter: 'blur(20px)', textAlign: 'center' }}>
          <div style={{ fontSize: '48px' }}>🌍</div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '10px 0', background: 'linear-gradient(90deg, #38bdf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BUJA CONNECT</h1>
          <p style={{ opacity: 0.6, fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '30px' }}>De Bujumbura au Monde</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
            <label style={{ fontSize: '12px', opacity: 0.7, letterSpacing: '1px' }}>TON NOM</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Remy" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '100px', padding: '14px 20px', color: 'white', outline: 'none', fontSize: '16px' }} />
            
            <label style={{ fontSize: '12px', opacity: 0.7, letterSpacing: '1px', marginTop: '10px' }}>TON PAYS</label>
            <select value={flag} onChange={e=>setFlag(e.target.value)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '100px', padding: '14px 20px', color: 'white', outline: 'none', fontSize: '16px' }}>
              {FLAGS.map(f => <option key={f.code} value={f.code} style={{ background: '#020617' }}>{f.code} {f.name}</option>)}
            </select>

            <button onClick={login} style={{ background: 'linear-gradient(90deg, #38bdf8, #a78bfa)', border: 'none', color: 'black', fontWeight: '900', padding: '14px', borderRadius: '100px', cursor: 'pointer', marginTop: '20px', fontSize: '16px', letterSpacing: '1px' }}>ENTRER →</button>
          </div>
        </div>
      </main>
    )
  }

  // CHAT - TON DESIGN ORIGINAL
  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, #1e293b 0%, #020617 100%)', color: 'white', display: 'flex', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui' }}>
      <div style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ textAlign: 'center', padding: '30px 0 10px' }}>
          <div style={{ fontSize: '48px' }}>🌍</div>
          <h1 style={{ fontSize: '36px', fontWeight: '900', letterSpacing: '-1px', margin: '10px 0', background: 'linear-gradient(90deg, #38bdf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BUJA CONNECT REMY</h1>
          <p style={{ opacity: 0.6, fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase' }}>{messages.length} messages • {connected ? '● LIVE' : '...'} • {name} {flag}</p>
          <button onClick={()=>{localStorage.clear(); setIsLogged(false)}} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '4px 12px', color: 'white', opacity: 0.5, fontSize: '11px', marginTop: '10px', cursor: 'pointer' }}>Changer de nom</button>
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
