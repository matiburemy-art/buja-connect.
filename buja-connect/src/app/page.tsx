"use client";
import { useState, useEffect } from "react";

type Contact = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread?: number;
};

export default function Page() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Toutes");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMsg, setNewMsg] = useState("");

  // Charger depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem("buja_contacts");
    if (saved) setContacts(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("buja_contacts", JSON.stringify(contacts));
  }, [contacts]);

  const addContact = () => {
    if (!newName.trim()) return;
    const c: Contact = {
      id: Date.now().toString(),
      name: newName,
      lastMessage: newMsg || "Nouveau contact ajouté",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setContacts([c, ...contacts]);
    setNewName(""); setNewMsg(""); setShowAdd(false);
  };

  const filtered = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const selected = contacts.find(c => c.id === selectedId);

  return (
    <div className="h-screen flex bg-[#f0f2f5] font-sans">
      {/* LEFT */}
      <div className="w-[420px] bg-white border-r border-[#e9edef] flex flex-col">
        {/* Header */}
        <div className="h-[59px] px-4 flex items-center justify-between bg-white">
          <h1 className="text-[#25D366] font-bold text-[22px] tracking-tight">WhatsApp</h1>
          <div className="flex gap-3 items-center">
            <button className="w-9 h-9 bg-[#25D366] rounded-full flex items-center justify-center text-white text-xl">+</button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="bg-[#f0f2f5] rounded-lg flex items-center px-3 h-9">
            <span className="text-[#54656f] mr-6">⌕</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher ou démarrer une discussion"
              className="bg-transparent w-full outline-none text-[14px] placeholder:text-[#667781]"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-3 py-2 overflow-x-auto">
          {["Toutes", "Non lues", "Favoris", "Groupes"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[13px] whitespace-nowrap border ${
                filter === f ? "bg-[#e7fce3] text-[#008069] border-[#e7fce3]" : "bg-white text-[#54656f] border-[#e9edef]"
              }`}
            >
              {f === "Non lues" && contacts.length > 0 ? `${f} ${contacts.length}` : f === "Groupes" ? `${f} 0` : f}
            </button>
          ))}
          <button onClick={() => setShowAdd(true)} className="w-7 h-7 border rounded-full flex items-center justify-center text-[#54656f]">+</button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-[#667781] text-[14px]">
              {contacts.length === 0 ? (
                <>
                  <p>Aucune discussion</p>
                  <button onClick={() => setShowAdd(true)} className="mt-3 text-[#25D366] font-medium">+ Ajouter un contact</button>
                </>
              ) : "Aucun résultat"}
            </div>
          ) : (
            filtered.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`flex gap-3 px-3 py-3 hover:bg-[#f5f6f6] cursor-pointer ${selectedId === c.id ? "bg-[#f0f2f5]" : ""}`}
              >
                <div className="w-12 h-12 rounded-full bg-[#dfe5e7] flex items-center justify-center font-bold text-[#54656f] shrink-0">
                  {c.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 border-b border-[#e9edef] pb-3">
                  <div className="flex justify-between">
                    <p className="font-medium text-[16px] text-[#111b21]">{c.name}</p>
                    <span className="text-[12px] text-[#667781]">{c.time}</span>
                  </div>
                  <p className="text-[14px] text-[#667781] truncate">✓ {c.lastMessage}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative">
        {/* WhatsApp wallpaper */}
        <div className="absolute inset-0 opacity-40" style={{backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`}}></div>
        
        {selected ? (
          <>
            <div className="h-[59px] bg-[#f0f2f5] border-l border-[#e9edef] flex items-center px-4 gap-3 z-10">
              <div className="w-10 h-10 rounded-full bg-[#dfe5e7] flex items-center justify-center font-bold">{selected.name[0].toUpperCase()}</div>
              <div><p className="font-semibold text-[#111b21]">{selected.name}</p><p className="text-[13px] text-[#667781]">en ligne</p></div>
            </div>
            <div className="flex-1 z-10 p-6 flex items-end">
              <div className="bg-white rounded-lg p-3 shadow text-[14px] max-w-[60%]">
                {selected.lastMessage}
                <span className="text-[11px] text-[#667781] ml-2">{selected.time}</span>
              </div>
            </div>
            <div className="h-[62px] bg-[#f0f2f5] flex items-center px-4 gap-3 z-10">
              <input placeholder="Entrez un message" className="flex-1 h-10 rounded-lg px-4 outline-none text-[14px]" />
            </div>
          </>
        ) : (
          <div className="flex-1 z-10 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-[32px] font-light text-[#41525d]">WhatsApp Web</h2>
              <p className="text-[#667781] text-[14px] mt-2">Sélectionne une discussion ou ajoute un contact</p>
              <button onClick={() => setShowAdd(true)} className="mt-6 bg-[#25D366] text-white px-6 py-2 rounded-full text-[14px]">+ Nouveau contact</button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL ADD */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[360px]">
            <h3 className="font-bold text-[18px] mb-4">Ajouter contact</h3>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nom / Numéro" className="w-full border rounded-lg p-3 mb-3 outline-none" />
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Dernier message" className="w-full border rounded-lg p-3 mb-4 outline-none" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-[#667781]">Annuler</button>
              <button onClick={addContact} className="px-5 py-2 bg-[#25D366] text-white rounded-full">Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
