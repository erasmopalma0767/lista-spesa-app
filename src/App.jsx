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
import Home from './components/Home';
import ListeSection from './components/ListeSection';
import './App.css';

const STORAGE_KEY_NOTES = 'lista-spesa-notes-v1';
const STORAGE_KEY_RECIPES = 'lista-spesa-recipes-v1';

const CATEGORIES = ['Antipasti', 'Primi', 'Secondi', 'Dolci', 'Altro'];

function App() {
  const [activeSection, setActiveSection] = useState('home'); // 'home' | 'lists' | 'recipes' | 'cosa-cucino' | 'preferiti' | 'leggero' | 'aggiungi'
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
    setShowMobileDetail(false);
  }

  function handleNavigate(section) {
    setActiveSection(section);
    setShowMobileDetail(false);
  }

  const isInSection = activeSection !== 'home';

  // Determine visibility classes for mobile
  const sidebarClass = showMobileDetail ? 'view-hidden' : '';
  const contentClass = showMobileDetail ? '' : 'view-hidden';

  return (
    <div className="app-root">
      {/* HEADER */}
      <header className="app-header">
        <div className="app-brand">
          {(showMobileDetail || isInSection) && (
            <button
              className="mobile-back-btn"
              onClick={showMobileDetail ? handleMobileBack : () => handleNavigate('home')}
            >
              ←
            </button>
          )}
          <strong>Casa • Liste & Ricette</strong>
        </div>

        <div className="nav-tabs">
          <button type="button" onClick={() => handleSwitchSection('lists')} className={`nav-tab ${activeSection === 'lists' ? 'active' : ''}`}>
            Liste spesa
          </button>
          <button type="button" onClick={() => handleSwitchSection('recipes')} className={`nav-tab ${activeSection === 'recipes' ? 'active' : ''}`}>
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

        {!user && (
          <button type="button" className="btn btn-primary btn-sm mobile-nav" style={{ position: 'static', margin: 0, height: 'auto', padding: '0.4rem' }} onClick={handleLoginWithGoogle}>
            Log In
          </button>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="app-main">
        {!user ? (
          <div className="login-screen">
            <div className="login-box">
              <div className="login-logo">🏠</div>
              <h2>Casa • Liste & Ricette</h2>
              <p>Accedi per gestire la spesa e le ricette di famiglia</p>
              <button type="button" className="btn btn-primary btn-login" onClick={handleLoginWithGoogle}>
                Entra con Google
              </button>
            </div>
          </div>
        ) : activeSection === 'home' ? (
          <Home
            user={user}
            notes={notes}
            recipes={recipes}
            onNavigate={handleNavigate}
          />
        ) : activeSection === 'lists' ? (
          <ListeSection
            notes={notes}
            selectedNoteId={selectedNoteId}
            onSelectNote={setSelectedNoteId}
          />
        ) : activeSection === 'recipes' ? (
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
        ) : activeSection === 'cosa-cucino' || activeSection === 'preferiti' || activeSection === 'leggero' || activeSection === 'aggiungi' ? (
          <div className="placeholder-section">
            <div className="placeholder-box">
              <p className="placeholder-emoji">
                {activeSection === 'cosa-cucino' && '🍳'}
                {activeSection === 'preferiti' && '⭐'}
                {activeSection === 'leggero' && '🥗'}
                {activeSection === 'aggiungi' && '✍️'}
              </p>
              <h2>
                {activeSection === 'cosa-cucino' && 'Cosa cucino?'}
                {activeSection === 'preferiti' && 'Preferiti'}
                {activeSection === 'leggero' && 'Leggero'}
                {activeSection === 'aggiungi' && 'Aggiungi ricetta'}
              </h2>
              <p>In arrivo nella prossima versione</p>
              <button className="btn btn-secondary" onClick={() => handleNavigate('home')}>
                ← Torna alla home
              </button>
            </div>
          </div>
        ) : null}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <div className="mobile-nav">
        <button
          className={`mobile-nav-item ${activeSection === 'home' ? 'active' : ''}`}
          onClick={() => handleNavigate('home')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>Home</span>
        </button>

        <button
          className={`mobile-nav-item ${activeSection === 'lists' ? 'active' : ''}`}
          onClick={() => handleSwitchSection('lists')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          <span>Spesa</span>
        </button>

        <button
          className={`mobile-nav-item ${activeSection === 'recipes' ? 'active' : ''}`}
          onClick={() => handleSwitchSection('recipes')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
          </svg>
          <span>Ricette</span>
        </button>

        {user ? (
          <button className="mobile-nav-item" onClick={handleLogout}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Esci</span>
          </button>
        ) : (
          <button className="mobile-nav-item" onClick={handleLoginWithGoogle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Login</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
