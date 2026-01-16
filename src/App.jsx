import { useEffect, useState } from 'react';
import { auth } from './firebase';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

const STORAGE_KEY_NOTES = 'lista-spesa-notes-v1';
const STORAGE_KEY_RECIPES = 'lista-spesa-recipes-v1';

// categorie fisse usate ovunque
const CATEGORIES = ['Antipasti', 'Primi', 'Secondi', 'Dolci', 'Altro'];

function App() {
  const [activeSection, setActiveSection] = useState('lists'); // 'lists' | 'recipes'
  const [user, setUser] = useState(null);

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

  const [notes, setNotes] = useState(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY_NOTES);
    if (!saved) {
      return [
        {
          id: 1,
          title: 'Spesa casa',
          items: [
            { id: 1, name: 'Latte', done: false },
            { id: 2, name: 'Pasta', done: false },
          ],
        },
        {
          id: 2,
          title: 'Spesa ufficio',
          items: [{ id: 3, name: 'Caffè', done: false }],
        },
      ];
    }
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  const [selectedNoteId, setSelectedNoteId] = useState(1);
  const [newItemName, setNewItemName] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
  }, [notes]);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || notes[0];

  function handleAddItem(event) {
    event.preventDefault();
    if (!selectedNote) return;

    const trimmed = newItemName.trim();
    if (!trimmed) return;

    const newItem = {
      id: Date.now(),
      name: trimmed,
      done: false,
    };

    const updatedNotes = notes.map((note) =>
      note.id === selectedNote.id
        ? { ...note, items: [...note.items, newItem] }
        : note
    );

    setNotes(updatedNotes);
    setNewItemName('');
  }

  function toggleItemDone(itemId) {
    if (!selectedNote) return;

    const updatedNotes = notes.map((note) => {
      if (note.id !== selectedNote.id) return note;
      return {
        ...note,
        items: note.items.map((item) =>
          item.id === itemId ? { ...item, done: !item.done } : item
        ),
      };
    });

    setNotes(updatedNotes);
  }

  function clearCurrentNote() {
    if (!selectedNote) return;
    if (!window.confirm('Vuoi svuotare questa nota?')) return;

    const updatedNotes = notes.map((note) =>
      note.id === selectedNote.id ? { ...note, items: [] } : note
    );

    setNotes(updatedNotes);
  }

  function handleAddNote(event) {
    event.preventDefault();
    const trimmed = newNoteTitle.trim();
    if (!trimmed) return;

    const newNote = {
      id: Date.now(),
      title: trimmed,
      items: [],
    };

    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    setSelectedNoteId(newNote.id);
    setNewNoteTitle('');
  }

  function handleDeleteNote(noteId) {
    if (
      !window.confirm(
        'Vuoi eliminare questa nota con tutto il suo contenuto?'
      )
    ) {
      return;
    }

    const updatedNotes = notes.filter((note) => note.id !== noteId);
    setNotes(updatedNotes);

    if (updatedNotes.length === 0) {
      setSelectedNoteId(undefined);
    } else {
      if (noteId === selectedNoteId) {
        setSelectedNoteId(updatedNotes[0].id);
      }
    }
  }

  // --- RICETTE ---

  const [recipes, setRecipes] = useState(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY_RECIPES);
    if (!saved) {
      return [];
    }
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  const [selectedRecipeId, setSelectedRecipeId] = useState(undefined);
  const [newRecipeTitle, setNewRecipeTitle] = useState('');
  const [newRecipeCategory, setNewRecipeCategory] = useState('');
  const [newRecipeContent, setNewRecipeContent] = useState('');
  const [newRecipeUrl, setNewRecipeUrl] = useState('');
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);

  const [selectedRecipeCategoryFilter, setSelectedRecipeCategoryFilter] =
    useState('Tutte'); // 'Tutte' o una voce di CATEGORIES

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(recipes));
  }, [recipes]);

  const selectedRecipe =
    recipes.find((r) => r.id === selectedRecipeId) || recipes[0];

  const filteredRecipes =
    selectedRecipeCategoryFilter === 'Tutte'
      ? recipes
      : recipes.filter(
          (r) => (r.category || 'Altro') === selectedRecipeCategoryFilter
        );

  function normalizeCategory(raw) {
    if (!raw) return 'Altro';
    return CATEGORIES.includes(raw) ? raw : 'Altro';
  }

  function handleAddRecipe(event) {
    event.preventDefault();
    if (isEditingRecipe) {
      handleSaveRecipeEdit();
    } else {
      const title = newRecipeTitle.trim();
      const content = newRecipeContent.trim();
      const url = newRecipeUrl.trim();
      const category = normalizeCategory(newRecipeCategory);

      if (!title || !content) return;

      const newRecipe = {
        id: Date.now(),
        title,
        category,
        content,
        url,
        favorite: false,
      };

      const updated = [...recipes, newRecipe];
      setRecipes(updated);
      setSelectedRecipeId(newRecipe.id);
      setNewRecipeTitle('');
      setNewRecipeCategory('');
      setNewRecipeContent('');
      setNewRecipeUrl('');
    }
  }

  function handleStartEditRecipe() {
    if (!selectedRecipe) return;

    setNewRecipeTitle(selectedRecipe.title || '');
    setNewRecipeCategory(selectedRecipe.category || 'Altro');
    setNewRecipeContent(selectedRecipe.content || '');
    setNewRecipeUrl(selectedRecipe.url || '');
    setIsEditingRecipe(true);
  }

  function handleSaveRecipeEdit() {
    if (!selectedRecipe) return;

    const title = newRecipeTitle.trim();
    const content = newRecipeContent.trim();
    const url = newRecipeUrl.trim();
    const category = normalizeCategory(newRecipeCategory);

    if (!title || !content) return;

    const updated = recipes.map((r) =>
      r.id === selectedRecipe.id
        ? { ...r, title, category, content, url }
        : r
    );

    setRecipes(updated);
    setIsEditingRecipe(false);
    setNewRecipeTitle('');
    setNewRecipeCategory('');
    setNewRecipeContent('');
    setNewRecipeUrl('');
  }

  function handleDeleteRecipe(recipeId) {
    if (!window.confirm('Vuoi eliminare questa ricetta?')) return;

    const updated = recipes.filter((r) => r.id !== recipeId);
    setRecipes(updated);

    if (updated.length === 0) {
      setSelectedRecipeId(undefined);
    } else if (recipeId === selectedRecipeId) {
      setSelectedRecipeId(updated[0].id);
    }

    if (recipeId === selectedRecipeId) {
      setIsEditingRecipe(false);
      setNewRecipeTitle('');
      setNewRecipeCategory('');
      setNewRecipeContent('');
      setNewRecipeUrl('');
    }
  }

  function toggleFavorite(recipeId) {
    const updated = recipes.map((r) =>
      r.id === recipeId ? { ...r, favorite: !r.favorite } : r
    );
    setRecipes(updated);
  }

  // --- UI ---

  return (
    <div className="app-root">
      {/* Barra superiore di navigazione */}
      <header className="app-header">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <strong style={{ marginRight: '1rem' }}>Casa • Liste & Ricette</strong>

          <button
            type="button"
            onClick={() => setActiveSection('lists')}
            className={
              activeSection === 'lists'
                ? 'header-tab header-tab--active'
                : 'header-tab'
            }
          >
            Liste spesa
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('recipes')}
            className={
              activeSection === 'recipes'
                ? 'header-tab header-tab--active'
                : 'header-tab'
            }
          >
            Ricette
          </button>
        </div>

        <div>
          {user ? (
            <>
              <span style={{ marginRight: '0.5rem', fontSize: '0.9rem' }}>
                {user.displayName || user.email}
              </span>
              <button type="button" onClick={handleLogout}>
                Esci
              </button>
            </>
          ) : (
            <button type="button" onClick={handleLoginWithGoogle}>
              Entra con Google
            </button>
          )}
        </div>
      </header>

      {/* Contenuto principale */}
      <main className="app-main">
        {!user ? (
          <div className="content">
            <h2>Accedi per usare liste e ricette</h2>
            <p>Clicca su "Entra con Google" in alto a destra.</p>
          </div>
        ) : activeSection === 'lists' ? (
          // --------- SEZIONE LISTE SPESA ----------
          <>
            {/* Colonna sinistra: elenco note */}
            <div className="sidebar">
              <h2>Note</h2>

              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                {notes.map((note) => (
                  <li
                    key={note.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem',
                      marginBottom: '0.25rem',
                      backgroundColor:
                        note.id === selectedNote?.id ? '#eef' : 'transparent',
                    }}
                  >
                    <span
                      onClick={() => setSelectedNoteId(note.id)}
                      style={{ cursor: 'pointer', flex: 1 }}
                    >
                      {note.title}
                      {note.items.length > 0 && ` (${note.items.length})`}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      style={{
                        marginLeft: '0.5rem',
                        border: 'none',
                        background: 'transparent',
                        color: '#a00',
                        cursor: 'pointer',
                      }}
                      title="Elimina nota"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>

              <form onSubmit={handleAddNote} style={{ marginTop: '1rem' }}>
                <input
                  type="text"
                  placeholder="Nuova nota..."
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    marginBottom: '0.5rem',
                  }}
                />
                <button type="submit" style={{ width: '100%' }}>
                  Aggiungi nota
                </button>
              </form>
            </div>

            {/* Colonna destra: dettagli nota selezionata */}
            <div className="content">
              {selectedNote ? (
                <>
                  <h1>{selectedNote.title}</h1>

                  <form
                    onSubmit={handleAddItem}
                    style={{ marginBottom: '1rem' }}
                  >
                    <input
                      type="text"
                      placeholder="Aggiungi un prodotto..."
                      value={newItemName}
                      onChange={(event) =>
                        setNewItemName(event.target.value)
                      }
                      style={{
                        padding: '0.5rem',
                        marginRight: '0.5rem',
                        minWidth: '250px',
                      }}
                    />
                    <button type="submit">Aggiungi</button>
                  </form>

                  {selectedNote.items.length === 0 ? (
                    <p>Nessun elemento in questa nota.</p>
                  ) : (
                    <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                      {selectedNote.items.map((item) => (
                        <li
                          key={item.id}
                          style={{
                            marginBottom: '0.25rem',
                            cursor: 'pointer',
                            textDecoration: item.done
                              ? 'line-through'
                              : 'none',
                          }}
                          onClick={() => toggleItemDone(item.id)}
                        >
                          {item.done ? '✅ ' : '🟢 '}
                          {item.name}
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    type="button"
                    onClick={clearCurrentNote}
                    disabled={selectedNote.items.length === 0}
                    style={{ marginTop: '1rem' }}
                  >
                    Svuota nota corrente
                  </button>
                </>
              ) : (
                <p>Nessuna nota selezionata.</p>
              )}
            </div>
          </>
        ) : (
          // --------- SEZIONE RICETTE ----------
          <>
            {/* Colonna sinistra: elenco ricette */}
            <div className="sidebar-recipes">
              <h2>Ricette</h2>

              {/* Badge categorie */}
              <div style={{ marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                  Filtra per categoria:
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.25rem',
                  }}
                >
                  {['Tutte', ...CATEGORIES].map((cat) => {
                    const isActive = selectedRecipeCategoryFilter === cat;
                    const colors =
                      cat === 'Antipasti'
                        ? { bg: '#fef3c7', fg: '#b45309' } // giallo
                        : cat === 'Primi'
                        ? { bg: '#e0f2fe', fg: '#0369a1' } // blu
                        : cat === 'Secondi'
                        ? { bg: '#dcfce7', fg: '#15803d' } // verde
                        : cat === 'Dolci'
                        ? { bg: '#fce7f3', fg: '#9d174d' } // rosa
                        : cat === 'Altro'
                        ? { bg: '#e5e7eb', fg: '#374151' } // grigio
                        : { bg: '#e5e7eb', fg: '#111827' }; // "Tutte"

                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedRecipeCategoryFilter(cat)}
                        style={{
                          borderRadius: '999px',
                          padding: '0.15rem 0.55rem',
                          border: 'none',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
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

              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                {filteredRecipes.map((recipe) => (
                  <li
                    key={recipe.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem',
                      marginBottom: '0.25rem',
                      backgroundColor:
                        recipe.id === selectedRecipe?.id ? '#eef' : 'transparent',
                    }}
                  >
                    <span
                      onClick={() => {
                        setSelectedRecipeId(recipe.id);
                        setIsEditingRecipe(false);
                        setNewRecipeTitle('');
                        setNewRecipeCategory('');
                        setNewRecipeContent('');
                        setNewRecipeUrl('');
                      }}
                      style={{ cursor: 'pointer', flex: 1 }}
                    >
                      {recipe.favorite ? '★ ' : ''}
                      {recipe.title}
                      {recipe.category && ` • ${recipe.category}`}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleFavorite(recipe.id)}
                      style={{
                        marginLeft: '0.25rem',
                        border: 'none',
                        background: 'transparent',
                        color: '#e0a800',
                        cursor: 'pointer',
                      }}
                      title="Segna come preferita"
                    >
                      ☆
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteRecipe(recipe.id)}
                      style={{
                        marginLeft: '0.25rem',
                        border: 'none',
                        background: 'transparent',
                        color: '#a00',
                        cursor: 'pointer',
                      }}
                      title="Elimina ricetta"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>

              <form onSubmit={handleAddRecipe} style={{ marginTop: '1rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>
                  {isEditingRecipe ? 'Modifica ricetta' : 'Nuova ricetta'}
                </h3>
                <input
                  type="text"
                  placeholder="Titolo ricetta..."
                  value={newRecipeTitle}
                  onChange={(e) => setNewRecipeTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    marginBottom: '0.3rem',
                  }}
                />
                <select
                  value={newRecipeCategory}
                  onChange={(e) => setNewRecipeCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    marginBottom: '0.3rem',
                  }}
                >
                  <option value="">Scegli categoria...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Link originale (opzionale)"
                  value={newRecipeUrl}
                  onChange={(e) => setNewRecipeUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    marginBottom: '0.3rem',
                  }}
                />
                <textarea
                  placeholder="Testo o ingredienti / procedimento (puoi incollare da internet)"
                  value={newRecipeContent}
                  onChange={(e) => setNewRecipeContent(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    marginBottom: '0.3rem',
                  }}
                />
                <button type="submit" style={{ width: '100%' }}>
                  {isEditingRecipe ? 'Salva modifiche' : 'Aggiungi ricetta'}
                </button>
              </form>
            </div>

            {/* Colonna destra: dettaglio ricetta */}
            <div className="content" style={{ whiteSpace: 'pre-wrap' }}>
              {selectedRecipe ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <h1>
                      {selectedRecipe.title}{' '}
                      {selectedRecipe.favorite ? '★' : ''}
                    </h1>
                    <button
                      type="button"
                      onClick={handleStartEditRecipe}
                      style={{
                        padding: '0.3rem 0.8rem',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        cursor: 'pointer',
                      }}
                    >
                      Modifica questa ricetta
                    </button>
                  </div>

                  {selectedRecipe.category && (
                    <p>
                      <strong>Categoria:</strong> {selectedRecipe.category}
                    </p>
                  )}
                  {selectedRecipe.url && (
                    <p>
                      <strong>Link originale:</strong>{' '}
                      <a
                        href={selectedRecipe.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {selectedRecipe.url}
                      </a>
                    </p>
                  )}
                  <h3>Dettagli</h3>
                  <p>{selectedRecipe.content}</p>
                </>
              ) : (
                <p>
                  Nessuna ricetta selezionata. Aggiungine una dalla colonna a
                  sinistra.
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
