import { useEffect, useState } from 'react';
import { auth } from './firebase';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { db } from './firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import './App.css';

const STORAGE_KEY_NOTES = 'lista-spesa-notes-v1';
const STORAGE_KEY_RECIPES = 'lista-spesa-recipes-v1';

const CATEGORIES = ['Antipasti', 'Primi', 'Secondi', 'Dolci', 'Altro'];

function App() {
  const [activeSection, setActiveSection] = useState('lists'); // 'lists' | 'recipes'
  const [user, setUser] = useState(null);

  // Mobile UI State
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // --- AUTENTICAZIONE ---

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  async function handleLoginWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Errore login Google', error);
      alert('Problema durante il login con Google');
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Errore logout', error);
    }
  }

  // --- NOTE / LISTE SPESA ---

  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState(undefined);
  const [newItemName, setNewItemName] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');

  useEffect(() => {
    if (!user) {
      setNotes([]);
      setLoadingNotes(false);
      setSelectedNoteId(undefined);
      return;
    }

    const colRef = collection(db, 'notes');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setNotes(data);
      setLoadingNotes(false);
      if (data.length > 0 && !selectedNoteId) {
        setSelectedNoteId(data[0].id);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || notes[0];

  function handleSelectNote(id) {
    setSelectedNoteId(id);
    setShowMobileDetail(true); // Open detail view on mobile
  }

  async function handleAddItem(event) {
    event.preventDefault();
    if (!selectedNote) return;
    const trimmed = newItemName.trim();
    if (!trimmed) return;
    const newItem = {
      id: Date.now(),
      name: trimmed,
      done: false,
    };
    const updatedItems = [...(selectedNote.items || []), newItem];
    try {
      const noteRef = doc(db, 'notes', selectedNote.id);
      await updateDoc(noteRef, { items: updatedItems });
      setNewItemName('');
    } catch (error) {
      console.error('Errore item', error);
    }
  }

  async function toggleItemDone(itemId) {
    if (!selectedNote) return;
    const updatedItems = (selectedNote.items || []).map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    try {
      const noteRef = doc(db, 'notes', selectedNote.id);
      await updateDoc(noteRef, { items: updatedItems });
    } catch (error) {
      console.error('Errore update item', error);
    }
  }

  async function clearCurrentNote() {
    if (!selectedNote) return;
    if (!window.confirm('Vuoi svuotare questa nota?')) return;
    try {
      const noteRef = doc(db, 'notes', selectedNote.id);
      await updateDoc(noteRef, { items: [] });
    } catch (error) {
      console.error('Errore clear note', error);
    }
  }

  async function handleAddNote(event) {
    event.preventDefault();
    const trimmed = newNoteTitle.trim();
    if (!trimmed) return;
    try {
      const newNote = {
        title: trimmed,
        items: [],
      };
      const docRef = await addDoc(collection(db, 'notes'), newNote);
      setSelectedNoteId(docRef.id);
      setNewNoteTitle('');
      setShowMobileDetail(true); // Open newly created note
    } catch (error) {
      console.error('Errore add note', error);
    }
  }

  async function handleDeleteNote(noteId) {
    if (!window.confirm('Eliminare nota?')) return;
    try {
      await deleteDoc(doc(db, 'notes', noteId));
      const updatedNotes = notes.filter((note) => note.id !== noteId);
      if (updatedNotes.length === 0) {
        setSelectedNoteId(undefined);
        setShowMobileDetail(false);
      } else {
        if (noteId === selectedNoteId) {
          setSelectedNoteId(updatedNotes[0].id);
        }
      }
    } catch (error) {
      console.error('Errore delete note', error);
    }
  }

  // --- RICETTE ---

  const [recipes, setRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [selectedRecipeId, setSelectedRecipeId] = useState(undefined);
  const [newRecipeTitle, setNewRecipeTitle] = useState('');
  const [newRecipeCategory, setNewRecipeCategory] = useState('');
  const [newRecipeContent, setNewRecipeContent] = useState('');
  const [newRecipeUrl, setNewRecipeUrl] = useState('');
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [selectedRecipeCategoryFilter, setSelectedRecipeCategoryFilter] = useState('Tutte');

  useEffect(() => {
    if (!user) {
      setRecipes([]);
      setLoadingRecipes(false);
      return;
    }
    const colRef = collection(db, 'recipes');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setRecipes(data);
      setLoadingRecipes(false);
    });
    return () => unsubscribe();
  }, [user]);

  const filteredRecipes = selectedRecipeCategoryFilter === 'Tutte'
    ? recipes
    : recipes.filter((r) => (r.category || 'Altro') === selectedRecipeCategoryFilter);

  const selectedRecipe = filteredRecipes.find((r) => r.id === selectedRecipeId);

  useEffect(() => {
    if (selectedRecipeId) {
      const isStillVisible = filteredRecipes.some((r) => r.id === selectedRecipeId);
      if (!isStillVisible) {
        if (filteredRecipes.length > 0) {
          setSelectedRecipeId(filteredRecipes[0].id);
        } else {
          setSelectedRecipeId(undefined);
        }
        setIsEditingRecipe(false);
        setNewRecipeTitle('');
      }
    } else if (filteredRecipes.length > 0) {
      setSelectedRecipeId(filteredRecipes[0].id);
    }
  }, [selectedRecipeCategoryFilter, filteredRecipes]);

  function normalizeCategory(raw) {
    if (!raw) return 'Altro';
    return CATEGORIES.includes(raw) ? raw : 'Altro';
  }

  function handleSelectRecipe(id) {
    setSelectedRecipeId(id);
    setIsEditingRecipe(false);
    setNewRecipeTitle('');
    setNewRecipeCategory('');
    setNewRecipeContent('');
    setNewRecipeUrl('');
    setShowMobileDetail(true); // Open detail view
  }

  async function handleAddRecipe(event) {
    event.preventDefault();
    if (isEditingRecipe) {
      handleSaveRecipeEdit();
    } else {
      const title = newRecipeTitle.trim();
      const content = newRecipeContent.trim();
      const url = newRecipeUrl.trim();
      const category = normalizeCategory(newRecipeCategory);
      if (!title || !content) return;

      try {
        const newRecipe = {
          title,
          category,
          content,
          url,
          favorite: false,
        };
        const docRef = await addDoc(collection(db, 'recipes'), newRecipe);
        setSelectedRecipeId(docRef.id);
        setNewRecipeTitle('');
        setNewRecipeCategory('');
        setNewRecipeContent('');
        setNewRecipeUrl('');
        setShowMobileDetail(true);
      } catch (error) {
        console.error('Errore add ricetta', error);
      }
    }
  }

  function handleStartEditRecipe() {
    if (!selectedRecipe) return;
    setNewRecipeTitle(selectedRecipe.title || '');
    setNewRecipeCategory(selectedRecipe.category || 'Altro');
    setNewRecipeContent(selectedRecipe.content || '');
    setNewRecipeUrl(selectedRecipe.url || '');
    setIsEditingRecipe(true);
    // On mobile, users are likely already in detail view, so we stay there
  }

  async function handleSaveRecipeEdit() {
    if (!selectedRecipe) return;
    const title = newRecipeTitle.trim();
    const content = newRecipeContent.trim();
    const url = newRecipeUrl.trim();
    const category = normalizeCategory(newRecipeCategory);
    if (!title || !content) return;

    try {
      const recipeRef = doc(db, 'recipes', selectedRecipe.id);
      await updateDoc(recipeRef, { title, category, content, url });
      setIsEditingRecipe(false);
      setNewRecipeTitle('');
      setNewRecipeCategory('');
      setNewRecipeContent('');
      setNewRecipeUrl('');
    } catch (error) {
      console.error('Errore save edit', error);
    }
  }

  async function handleDeleteRecipe(recipeId) {
    if (!window.confirm('Eliminare ricetta?')) return;
    try {
      await deleteDoc(doc(db, 'recipes', recipeId));
      const updated = recipes.filter((r) => r.id !== recipeId);
      if (updated.length === 0) {
        setSelectedRecipeId(undefined);
        setShowMobileDetail(false);
      } else if (recipeId === selectedRecipeId) {
        setSelectedRecipeId(updated[0].id);
      }
    } catch (error) {
      console.error('Errore delete ricetta', error);
    }
  }

  async function toggleFavorite(recipeId) {
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return;
    try {
      const recipeRef = doc(db, 'recipes', recipeId);
      await updateDoc(recipeRef, { favorite: !recipe.favorite });
    } catch (error) {
      console.error('Errore favorite', error);
    }
  }

  // --- UI NAVIGATION HELPERS ---

  function handleMobileBack() {
    setShowMobileDetail(false);
  }

  function handleSwitchSection(section) {
    setActiveSection(section);
    setShowMobileDetail(false); // Reset to list view when switching main tabs
  }

  // Determine visibility classes for mobile
  const sidebarClass = showMobileDetail ? 'view-hidden' : '';
  const contentClass = showMobileDetail ? '' : 'view-hidden';

  return (
    <div className="app-root">
      {/* HEADER */}
      <header className="app-header">
        <div className="app-brand">
          {showMobileDetail && (
            <button className="mobile-back-btn" onClick={handleMobileBack}>
              ←
            </button>
          )}
          <strong>Casa • Liste & Ricette</strong>
        </div>

        <div className="nav-tabs">
          <button
            type="button"
            onClick={() => handleSwitchSection('lists')}
            className={`nav-tab ${activeSection === 'lists' ? 'active' : ''}`}
          >
            Liste spesa
          </button>
          <button
            type="button"
            onClick={() => handleSwitchSection('recipes')}
            className={`nav-tab ${activeSection === 'recipes' ? 'active' : ''}`}
          >
            Ricette
          </button>
        </div>

        <div className="desktop-nav-controls">
          {user ? (
            <>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                {user.displayName || user.email}
              </span>
              <button type="button" className="btn btn-secondary" onClick={handleLogout}>
                Esci
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={handleLoginWithGoogle}>
              Entra con Google
            </button>
          )}
        </div>

        {/* Mobile Logout (Icon only or simplified) */}
        {!user && (
          <button type="button" className="btn btn-primary btn-sm mobile-nav" style={{ position: 'static', margin: 0, height: 'auto', padding: '0.4rem' }} onClick={handleLoginWithGoogle}>
            Log In
          </button>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="app-main">
        {!user ? (
          <div className="content-area" style={{ position: 'static', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <h2>Accedi per iniziare</h2>
            <p className="text-secondary">Usa il pulsante in alto a destra.</p>
          </div>
        ) : activeSection === 'lists' ? (
          // LISTE SPESA
          <>
            {/* Sidebar (List View) */}
            <div className={`sidebar ${sidebarClass}`}>
              <div className="sidebar-header">
                <h2>Note</h2>
                <form onSubmit={handleAddNote}>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Nuova nota..."
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" title="Aggiungi">
                      +
                    </button>
                  </div>
                </form>
              </div>

              <div className="sidebar-content">
                <ul className="item-list">
                  {notes.map((note) => (
                    <li
                      key={note.id}
                      className={`list-item ${note.id === selectedNote?.id ? 'selected' : ''}`}
                    >
                      <span
                        onClick={() => handleSelectNote(note.id)}
                        style={{ flex: 1 }}
                      >
                        {note.title}
                        {note.items.length > 0 && ` (${note.items.length})`}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                        className="btn-ghost"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Content (Detail View) */}
            <div className={`content-area ${contentClass}`}>
              {selectedNote ? (
                <>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h1>{selectedNote.title}</h1>
                  </div>

                  <form onSubmit={handleAddItem} style={{ marginBottom: '1.5rem' }}>
                    <div className="input-group">
                      <input
                        type="text"
                        placeholder="Aggiungi..."
                        value={newItemName}
                        onChange={(event) => setNewItemName(event.target.value)}
                      />
                      <button type="submit" className="btn btn-primary">Aggiungi</button>
                    </div>
                  </form>

                  {selectedNote.items.length === 0 ? (
                    <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: '2rem' }}>
                      Nessun elemento.
                    </p>
                  ) : (
                    <ul className="item-list">
                      {selectedNote.items.map((item) => (
                        <li
                          key={item.id}
                          className="list-item"
                          style={{
                            textDecoration: item.done ? 'line-through' : 'none',
                            color: item.done ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)'
                          }}
                          onClick={() => toggleItemDone(item.id)}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {item.done ? '✅' : '⚪'} {item.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={clearCurrentNote}
                      disabled={selectedNote.items.length === 0}
                    >
                      Svuota nota
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-tertiary)' }}>
                  <p>Seleziona una nota.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          // RICETTE
          <>
            <div className={`sidebar-recipes ${sidebarClass}`}>
              <div className="sidebar-header">
                <h2>Ricette</h2>

                <div style={{ marginBottom: '1rem' }}>
                  <div className="category-filters">
                    {['Tutte', ...CATEGORIES].map((cat) => {
                      const isActive = selectedRecipeCategoryFilter === cat;
                      const colors =
                        cat === 'Antipasti' ? { bg: '#fffbeb', fg: '#b45309' }
                          : cat === 'Primi' ? { bg: '#eff6ff', fg: '#1d4ed8' }
                            : cat === 'Secondi' ? { bg: '#f0fdf4', fg: '#15803d' }
                              : cat === 'Dolci' ? { bg: '#fdf2f8', fg: '#be185d' }
                                : cat === 'Altro' ? { bg: '#f3f4f6', fg: '#374151' }
                                  : { bg: '#f1f5f9', fg: '#0f172a' };

                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedRecipeCategoryFilter(cat)}
                          className="badge"
                          style={{
                            backgroundColor: isActive ? colors.fg : colors.bg,
                            color: isActive ? '#ffffff' : colors.fg,
                          }}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleAddRecipe}>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                    Nuova ricetta
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Titolo..."
                      value={newRecipeTitle}
                      onChange={(e) => setNewRecipeTitle(e.target.value)}
                    />
                    <select
                      value={newRecipeCategory}
                      onChange={(e) => setNewRecipeCategory(e.target.value)}
                    >
                      <option value="">Categoria...</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="URL..."
                      value={newRecipeUrl}
                      onChange={(e) => setNewRecipeUrl(e.target.value)}
                    />
                    <textarea
                      placeholder="Ingredienti..."
                      value={newRecipeContent}
                      onChange={(e) => setNewRecipeContent(e.target.value)}
                      rows={3}
                      style={{ resize: 'vertical' }}
                    />
                    <button type="submit" className="btn btn-primary">
                      Aggiungi
                    </button>
                  </div>
                </form>
              </div>

              <div className="sidebar-content">
                <ul className="item-list">
                  {filteredRecipes.map((recipe) => (
                    <li
                      key={recipe.id}
                      className={`list-item ${recipe.id === selectedRecipe?.id ? 'selected' : ''}`}
                    >
                      <span
                        onClick={() => handleSelectRecipe(recipe.id)}
                        style={{ flex: 1 }}
                      >
                        {recipe.favorite && <span style={{ color: 'var(--color-warning)', marginRight: '4px' }}>★</span>}
                        {recipe.title}
                      </span>
                      <div style={{ display: 'flex' }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe.id); }}
                          className={`btn-ghost-star ${recipe.favorite ? 'active' : ''}`}
                        >
                          {recipe.favorite ? '★' : '☆'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteRecipe(recipe.id); }}
                          className="btn-ghost"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={`content-area ${contentClass}`}>
              {selectedRecipe ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: '1rem',
                      borderBottom: '1px solid var(--color-border)',
                      paddingBottom: '1rem'
                    }}
                  >
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {selectedRecipe.title}
                      {selectedRecipe.favorite && <span style={{ color: 'var(--color-warning)', fontSize: '0.8em' }}>★</span>}
                    </h1>
                    <button
                      type="button"
                      onClick={handleStartEditRecipe}
                      className="btn btn-secondary"
                    >
                      Modifica
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    {selectedRecipe.category && (
                      <span className="badge" style={{ background: 'var(--slate-100)', color: 'var(--slate-600)' }}>
                        {selectedRecipe.category}
                      </span>
                    )}
                    {selectedRecipe.url && (
                      <a href={selectedRecipe.url} target="_blank" rel="noopener noreferrer">
                        🔗 Link
                      </a>
                    )}
                  </div>

                  {isEditingRecipe && (
                    <form onSubmit={(e) => { e.preventDefault(); handleSaveRecipeEdit(); }} style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--slate-50)', borderRadius: '8px' }}>
                      <h3>Modifica Ricetta</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input value={newRecipeTitle} onChange={(e) => setNewRecipeTitle(e.target.value)} placeholder="Titolo" />
                        <select value={newRecipeCategory} onChange={(e) => setNewRecipeCategory(e.target.value)}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input value={newRecipeUrl} onChange={(e) => setNewRecipeUrl(e.target.value)} placeholder="URL" />
                        <textarea value={newRecipeContent} onChange={(e) => setNewRecipeContent(e.target.value)} rows={5} />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button type="submit" className="btn btn-primary">Salva</button>
                          <button type="button" className="btn btn-secondary" onClick={() => setIsEditingRecipe(false)}>Annulla</button>
                        </div>
                      </div>
                    </form>
                  )}

                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', color: 'var(--color-text-secondary)' }}>
                    {selectedRecipe.content}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-tertiary)' }}>
                  <p>Seleziona una ricetta.</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <div className="mobile-nav">
        <button
          className={`mobile-nav-item ${activeSection === 'lists' ? 'active' : ''}`}
          onClick={() => handleSwitchSection('lists')}
        >
          <span style={{ fontSize: '1.2rem' }}>📝</span>
          <span>Liste</span>
        </button>

        <button
          className={`mobile-nav-item ${activeSection === 'recipes' ? 'active' : ''}`}
          onClick={() => handleSwitchSection('recipes')}
        >
          <span style={{ fontSize: '1.2rem' }}>🍳</span>
          <span>Ricette</span>
        </button>

        {user ? (
          <button className="mobile-nav-item" onClick={handleLogout}>
            <span style={{ fontSize: '1.2rem' }}>🚪</span>
            <span>Esci</span>
          </button>
        ) : (
          <button className="mobile-nav-item" onClick={handleLoginWithGoogle}>
            <span style={{ fontSize: '1.2rem' }}>👤</span>
            <span>Login</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
