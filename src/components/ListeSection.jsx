import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  query, orderBy, limit, getDocs, serverTimestamp,
} from 'firebase/firestore';

const DAYS_THRESHOLD = 5;

export default function ListeSection({ notes, selectedNoteId, onSelectNote }) {
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [fabOpen, setFabOpen] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const fabInputRef = useRef(null);
  const noteTabsRef = useRef(null);

  const selectedNote = notes.find(n => n.id === selectedNoteId) || notes[0];
  const todoItems = (selectedNote?.items || []).filter(i => !i.done);
  const doneItems = (selectedNote?.items || []).filter(i => i.done);

  // Carica storico acquisti
  useEffect(() => {
    async function loadHistory() {
      try {
        const q = query(collection(db, 'purchases'), orderBy('date', 'desc'), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) return;
        const latest = { id: snap.docs[0].id, ...snap.docs[0].data() };
        if (!latest.date) return;
        const daysSince = (Date.now() - latest.date.toMillis()) / (1000 * 60 * 60 * 24);
        if (daysSince >= DAYS_THRESHOLD) {
          setSuggestions(latest);
          setSelectedSuggestions(latest.items.map(i => i.name));
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadHistory();
  }, []);

  useEffect(() => {
    if (fabOpen && fabInputRef.current) fabInputRef.current.focus();
  }, [fabOpen]);

  async function handleAddNote(e) {
    e.preventDefault();
    const title = newNoteTitle.trim();
    if (!title) return;
    try {
      const ref = await addDoc(collection(db, 'notes'), { title, items: [] });
      onSelectNote(ref.id);
      setNewNoteTitle('');
      setShowAddNote(false);
    } catch (err) { console.error(err); }
  }

  async function handleDeleteNote(noteId, e) {
    e.stopPropagation();
    if (!window.confirm('Eliminare questa lista?')) return;
    try { await deleteDoc(doc(db, 'notes', noteId)); } catch (err) { console.error(err); }
  }

  async function handleAddItem(e) {
    e.preventDefault();
    if (!selectedNote) return;
    const trimmed = newItemName.trim();
    if (!trimmed) return;
    const newItem = { id: Date.now(), name: trimmed, done: false };
    try {
      await updateDoc(doc(db, 'notes', selectedNote.id), {
        items: [...(selectedNote.items || []), newItem],
      });
      setNewItemName('');
    } catch (err) { console.error(err); }
  }

  async function toggleItem(itemId) {
    if (!selectedNote) return;
    const updated = selectedNote.items.map(i =>
      i.id === itemId ? { ...i, done: !i.done } : i
    );
    try { await updateDoc(doc(db, 'notes', selectedNote.id), { items: updated }); }
    catch (err) { console.error(err); }
  }

  async function deleteItem(itemId) {
    if (!selectedNote) return;
    const updated = selectedNote.items.filter(i => i.id !== itemId);
    try { await updateDoc(doc(db, 'notes', selectedNote.id), { items: updated }); }
    catch (err) { console.error(err); }
  }

  async function handleClearNote() {
    if (!selectedNote) return;
    const bought = selectedNote.items.filter(i => i.done);
    const msg = bought.length > 0
      ? `Salvo ${bought.length} acquisti nello storico e svuoto la lista?`
      : 'Svuotare la lista?';
    if (!window.confirm(msg)) return;
    try {
      if (bought.length > 0) {
        await addDoc(collection(db, 'purchases'), {
          items: bought.map(i => ({ name: i.name })),
          date: serverTimestamp(),
          noteTitle: selectedNote.title,
        });
        setSuggestions(null);
      }
      await updateDoc(doc(db, 'notes', selectedNote.id), { items: [] });
    } catch (err) { console.error(err); }
  }

  async function addSuggestionsToList() {
    if (!selectedNote || selectedSuggestions.length === 0) return;
    const existing = (selectedNote.items || []).map(i => i.name.toLowerCase());
    const toAdd = selectedSuggestions
      .filter(name => !existing.includes(name.toLowerCase()))
      .map(name => ({ id: Date.now() + Math.random(), name, done: false }));
    try {
      await updateDoc(doc(db, 'notes', selectedNote.id), {
        items: [...(selectedNote.items || []), ...toAdd],
      });
      setSuggestions(null);
    } catch (err) { console.error(err); }
  }

  function toggleSuggestion(name) {
    setSelectedSuggestions(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  }

  function formatDate(ts) {
    if (!ts) return '';
    return ts.toDate().toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  }

  return (
    <div className="liste-root">

      {/* TABS NOTE */}
      <div className="note-tabs-wrap">
        <div className="note-tabs" ref={noteTabsRef}>
          {notes.map(note => (
            <button
              key={note.id}
              className={`note-tab ${note.id === selectedNote?.id ? 'active' : ''}`}
              onClick={() => onSelectNote(note.id)}
            >
              <span className="note-tab-title">{note.title}</span>
              {note.items.length > 0 && (
                <span className="note-tab-count">
                  {note.items.filter(i => i.done).length}/{note.items.length}
                </span>
              )}
              <span className="note-tab-delete" onClick={e => handleDeleteNote(note.id, e)}>×</span>
            </button>
          ))}
          {showAddNote ? (
            <form onSubmit={handleAddNote} className="note-tab-form">
              <input
                autoFocus
                value={newNoteTitle}
                onChange={e => setNewNoteTitle(e.target.value)}
                placeholder="Nome lista..."
                onBlur={() => { if (!newNoteTitle.trim()) setShowAddNote(false); }}
              />
            </form>
          ) : (
            <button className="note-tab note-tab-add" onClick={() => setShowAddNote(true)}>+</button>
          )}
        </div>
      </div>

      {/* BANNER SUGGERIMENTI */}
      {suggestions && selectedNote && (
        <div className="suggestions-banner">
          <div className="suggestions-header">
            <span>Ripeti spesa del {formatDate(suggestions.date)}?</span>
            <button className="btn-ghost" onClick={() => setSuggestions(null)}>×</button>
          </div>
          <div className="suggestions-chips">
            {suggestions.items.map(item => (
              <button
                key={item.name}
                className={`suggestion-chip ${selectedSuggestions.includes(item.name) ? 'selected' : ''}`}
                onClick={() => toggleSuggestion(item.name)}
              >
                {item.name}
              </button>
            ))}
          </div>
          {selectedSuggestions.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={addSuggestionsToList}>
              Aggiungi {selectedSuggestions.length} prodotti
            </button>
          )}
        </div>
      )}

      {/* LISTA ITEM */}
      <div className="items-list-wrap">
        {!selectedNote ? (
          <div className="empty-state"><p>Crea una lista per iniziare</p></div>
        ) : selectedNote.items.length === 0 ? (
          <div className="empty-state"><p>Lista vuota — tocca + per aggiungere</p></div>
        ) : (
          <ul className="items-list">
            {todoItems.map(item => (
              <li key={item.id} className="item-row">
                <button className="item-checkbox" onClick={() => toggleItem(item.id)} />
                <span className="item-name">{item.name}</span>
                <button className="item-delete" onClick={() => deleteItem(item.id)}>×</button>
              </li>
            ))}

            {todoItems.length > 0 && doneItems.length > 0 && (
              <li className="items-divider"><span>Nel carrello ({doneItems.length})</span></li>
            )}

            {doneItems.map(item => (
              <li key={item.id} className="item-row item-done">
                <button className="item-checkbox checked" onClick={() => toggleItem(item.id)} />
                <span className="item-name">{item.name}</span>
                <button className="item-delete" onClick={() => deleteItem(item.id)}>×</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* FOOTER SVUOTA */}
      {selectedNote && selectedNote.items.length > 0 && (
        <div className="liste-footer">
          <button className="btn-clear" onClick={handleClearNote}>
            Svuota lista
            {doneItems.length > 0 && ` (salva ${doneItems.length} acquisti)`}
          </button>
        </div>
      )}

      {/* FAB */}
      {selectedNote && (
        <div className="fab-wrap">
          {fabOpen && (
            <form className="fab-input-bar" onSubmit={handleAddItem}>
              <input
                ref={fabInputRef}
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                placeholder="Cosa aggiungi?"
              />
              <button type="submit" className="fab-input-send">+</button>
            </form>
          )}
          <button
            className={`fab-btn ${fabOpen ? 'open' : ''}`}
            onClick={() => setFabOpen(v => !v)}
          >
            {fabOpen ? '×' : '+'}
          </button>
        </div>
      )}

    </div>
  );
}
