import { useState, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const CATEGORIES = ['Antipasti', 'Primi', 'Secondi', 'Dolci', 'Altro'];

const CAT_COLORS = {
  Antipasti: { bg: '#fffbeb', fg: '#b45309' },
  Primi:     { bg: '#eff6ff', fg: '#1d4ed8' },
  Secondi:   { bg: '#f0fdf4', fg: '#15803d' },
  Dolci:     { bg: '#fdf2f8', fg: '#be185d' },
  Altro:     { bg: '#f3f4f6', fg: '#374151' },
};

function sentenceCase(str) {
  if (!str) return '';
  const s = str.trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function getIngredients(recipe) {
  if (recipe.ingredients && recipe.ingredients.length > 0) return recipe.ingredients;
  return [];
}

function getProcedimento(recipe) {
  return recipe.procedimento || recipe.content || '';
}

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconChevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const IconBack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

export default function RicetteSection({ recipes }) {
  const [view, setView] = useState('list'); // 'list' | 'detail' | 'form'
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Tutte');
  const [checked, setChecked] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  // Form
  const [fTitle, setFTitle] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fUrl, setFUrl] = useState('');
  const [fProcedimento, setFProcedimento] = useState('');
  const [fIngredients, setFIngredients] = useState([]);
  const [newIngNome, setNewIngNome] = useState('');
  const [newIngQta, setNewIngQta] = useState('');
  const ingRef = useRef(null);

  const selectedRecipe = recipes.find(r => r.id === selectedId);

  const filtered = recipes.filter(r => {
    const matchCat = catFilter === 'Tutte' || (r.category || 'Altro') === catFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || r.title?.toLowerCase().includes(q)
      || (r.ingredients || []).some(i => i.nome?.toLowerCase().includes(q))
      || (r.content || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  function openRecipe(id) {
    setSelectedId(id);
    setChecked({});
    setView('detail');
  }

  function openAddForm() {
    setIsEditing(false);
    setFTitle(''); setFCategory(''); setFUrl('');
    setFProcedimento(''); setFIngredients([]);
    setNewIngNome(''); setNewIngQta('');
    setView('form');
  }

  function openEditForm() {
    if (!selectedRecipe) return;
    setIsEditing(true);
    setFTitle(selectedRecipe.title || '');
    setFCategory(selectedRecipe.category || 'Altro');
    setFUrl(selectedRecipe.url || '');
    setFProcedimento(getProcedimento(selectedRecipe));
    setFIngredients(getIngredients(selectedRecipe));
    setNewIngNome(''); setNewIngQta('');
    setView('form');
  }

  function addIngredient(e) {
    e?.preventDefault();
    const nome = newIngNome.trim();
    if (!nome) return;
    setFIngredients(prev => [...prev, { id: Date.now(), nome, quantita: newIngQta.trim() }]);
    setNewIngNome(''); setNewIngQta('');
    ingRef.current?.focus();
  }

  async function handleSave(e) {
    e.preventDefault();
    const title = fTitle.trim();
    if (!title) return;
    const data = {
      title,
      category: fCategory || 'Altro',
      url: fUrl.trim(),
      ingredients: fIngredients,
      procedimento: fProcedimento.trim(),
      favorite: isEditing ? (selectedRecipe?.favorite || false) : false,
    };
    try {
      if (isEditing && selectedRecipe) {
        await updateDoc(doc(db, 'recipes', selectedRecipe.id), data);
        setView('detail');
      } else {
        const ref = await addDoc(collection(db, 'recipes'), data);
        setSelectedId(ref.id);
        setView('detail');
      }
    } catch (err) { console.error(err); }
  }

  async function handleDelete() {
    if (!selectedRecipe || !window.confirm('Eliminare questa ricetta?')) return;
    try {
      await deleteDoc(doc(db, 'recipes', selectedRecipe.id));
      setView('list');
      setSelectedId(null);
    } catch (err) { console.error(err); }
  }

  async function toggleFavorite() {
    if (!selectedRecipe) return;
    try {
      await updateDoc(doc(db, 'recipes', selectedRecipe.id), { favorite: !selectedRecipe.favorite });
    } catch (err) { console.error(err); }
  }

  // ── LIST VIEW ──────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="ricette-root">
        <div className="ricette-top">
          <div className="ricette-search-bar">
            <IconSearch />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca ricette o ingredienti..."
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>×</button>
            )}
          </div>

          <div className="ricette-filters">
            {['Tutte', ...CATEGORIES].map(cat => (
              <button
                key={cat}
                className={`filter-chip ${catFilter === cat ? 'active' : ''}`}
                onClick={() => setCatFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="ricette-list-wrap">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>{search ? 'Nessuna ricetta trovata' : 'Nessuna ricetta — aggiungine una!'}</p>
            </div>
          ) : (
            <ul className="ricette-list">
              {filtered.map(r => {
                const colors = CAT_COLORS[r.category] || CAT_COLORS.Altro;
                return (
                  <li key={r.id} className="ricetta-card" onClick={() => openRecipe(r.id)}>
                    <div className="ricetta-card-body">
                      <span className="ricetta-card-title">{sentenceCase(r.title)}</span>
                      <span
                        className="ricetta-cat-badge"
                        style={{ background: colors.bg, color: colors.fg }}
                      >
                        {r.category || 'Altro'}
                      </span>
                    </div>
                    <div className="ricetta-card-right">
                      {r.favorite && <span className="ricetta-star-sm">★</span>}
                      <IconChevron />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <button className="ricette-fab" onClick={openAddForm}>+</button>
      </div>
    );
  }

  // ── DETAIL VIEW ────────────────────────────────────────────
  if (view === 'detail') {
    if (!selectedRecipe) { setView('list'); return null; }
    const ingredients = getIngredients(selectedRecipe);
    const procedimento = getProcedimento(selectedRecipe);
    const colors = CAT_COLORS[selectedRecipe.category] || CAT_COLORS.Altro;

    return (
      <div className="ricette-root">
        <div className="detail-header">
          <button className="detail-back" onClick={() => setView('list')}>
            <IconBack />
          </button>
          <div className="detail-actions">
            <button
              className={`btn-star ${selectedRecipe.favorite ? 'active' : ''}`}
              onClick={toggleFavorite}
            >
              {selectedRecipe.favorite ? '★' : '☆'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={openEditForm}>Modifica</button>
            <button className="btn-delete" onClick={handleDelete}>✕</button>
          </div>
        </div>

        <div className="detail-content">
          <div className="detail-title-wrap">
            <h1 className="detail-title">{sentenceCase(selectedRecipe.title)}</h1>
            <div className="detail-meta">
              <span className="ricetta-cat-badge" style={{ background: colors.bg, color: colors.fg }}>
                {selectedRecipe.category || 'Altro'}
              </span>
              {selectedRecipe.url && (
                <a href={selectedRecipe.url} target="_blank" rel="noopener noreferrer" className="detail-link">
                  🔗 Ricetta originale
                </a>
              )}
            </div>
          </div>

          {ingredients.length > 0 && (
            <section className="detail-section">
              <h2 className="detail-section-title">Ingredienti</h2>
              <ul className="ing-list">
                {ingredients.map(ing => (
                  <li
                    key={ing.id}
                    className={`ing-row ${checked[ing.id] ? 'checked' : ''}`}
                    onClick={() => setChecked(prev => ({ ...prev, [ing.id]: !prev[ing.id] }))}
                  >
                    <span className={`ing-check ${checked[ing.id] ? 'done' : ''}`} />
                    <span className="ing-nome">{ing.nome}</span>
                    {ing.quantita && <span className="ing-qta">{ing.quantita}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {procedimento && (
            <section className="detail-section">
              <h2 className="detail-section-title">
                {ingredients.length > 0 ? 'Procedimento' : 'Dettagli'}
              </h2>
              <p className="detail-procedimento">{procedimento}</p>
            </section>
          )}
        </div>
      </div>
    );
  }

  // ── FORM VIEW ──────────────────────────────────────────────
  return (
    <div className="ricette-root">
      <div className="detail-header">
        <button className="detail-back" onClick={() => setView(isEditing ? 'detail' : 'list')}>
          <IconBack />
        </button>
        <h2 className="form-title-label">{isEditing ? 'Modifica ricetta' : 'Nuova ricetta'}</h2>
        <div />
      </div>

      <form className="ricetta-form" onSubmit={handleSave}>
        <div className="form-field">
          <label>Titolo</label>
          <input
            value={fTitle}
            onChange={e => setFTitle(e.target.value)}
            placeholder="Nome della ricetta..."
            required
          />
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Categoria</label>
            <select value={fCategory} onChange={e => setFCategory(e.target.value)}>
              <option value="">Seleziona...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label>URL ricetta (opzionale)</label>
          <input
            value={fUrl}
            onChange={e => setFUrl(e.target.value)}
            placeholder="https://..."
            type="url"
          />
        </div>

        <div className="form-field">
          <label>Ingredienti</label>
          <ul className="form-ing-list">
            {fIngredients.map(ing => (
              <li key={ing.id} className="form-ing-row">
                <span className="form-ing-nome">{ing.nome}</span>
                {ing.quantita && <span className="form-ing-qta">{ing.quantita}</span>}
                <button type="button" className="form-ing-del" onClick={() => removeIngredient(ing.id)}>×</button>
              </li>
            ))}
          </ul>
          <div className="form-ing-add">
            <input
              ref={ingRef}
              value={newIngNome}
              onChange={e => setNewIngNome(e.target.value)}
              placeholder="Ingrediente..."
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(); } }}
            />
            <input
              value={newIngQta}
              onChange={e => setNewIngQta(e.target.value)}
              placeholder="Quantità..."
              className="form-ing-qta-input"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(); } }}
            />
            <button type="button" className="form-ing-add-btn" onClick={addIngredient}>+</button>
          </div>
        </div>

        <div className="form-field">
          <label>Procedimento</label>
          <textarea
            value={fProcedimento}
            onChange={e => setFProcedimento(e.target.value)}
            placeholder="Descrivi i passaggi..."
            rows={5}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-form-save">
          {isEditing ? 'Salva modifiche' : 'Aggiungi ricetta'}
        </button>
      </form>
    </div>
  );

  function removeIngredient(id) {
    setFIngredients(prev => prev.filter(i => i.id !== id));
  }
}
