import { useState, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { calculateRecipeCalories, calorieBadgeClass, parseIngredientsFromText } from '../utils/calories';

const CATEGORIES = ['Antipasti', 'Primi', 'Secondi', 'Dolci', 'Altro'];
const LEGGERO_THRESHOLD = 400; // kcal/porzione

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
  return recipe.ingredients?.length > 0 ? recipe.ingredients : [];
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

// preFilter: null | 'favorite' | 'leggero'
// autoOpenForm: bool — apre subito il form (tile Aggiungi)
// initialRecipeId: string — apre subito il dettaglio di quella ricetta
export default function RicetteSection({ recipes, preFilter = null, autoOpenForm = false, initialRecipeId = null }) {
  const [view, setView] = useState(() => {
    if (autoOpenForm) return 'form';
    if (initialRecipeId) return 'detail';
    return 'list';
  });
  const [selectedId, setSelectedId] = useState(() => initialRecipeId || null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Tutte');
  const [checked, setChecked] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  // Form fields
  const [fTitle, setFTitle] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fUrl, setFUrl] = useState('');
  const [fProcedimento, setFProcedimento] = useState('');
  const [fIngredients, setFIngredients] = useState([]);
  const [fPortions, setFPortions] = useState('4');
  const [newIngNome, setNewIngNome] = useState('');
  const [newIngQta, setNewIngQta] = useState('');
  const ingRef = useRef(null);

  // Arricchisce ogni ricetta con calorie calcolate on-the-fly se non già salvate
  const enrichedRecipes = useMemo(() => recipes.map(r => {
    if (r.caloriesPerPortion != null) return r;
    const cal = calculateRecipeCalories(r.ingredients, r.portions || 4);
    if (!cal) return r;
    return { ...r, caloriesPerPortion: cal.perPortion, caloriesTotal: cal.total };
  }), [recipes]);

  const selectedRecipe = enrichedRecipes.find(r => r.id === selectedId);

  // Calorie preview nel form (si aggiorna live)
  const previewCal = useMemo(
    () => calculateRecipeCalories(fIngredients, Number(fPortions) || 4),
    [fIngredients, fPortions]
  );

  // Applica pre-filtro (preferiti / leggero)
  const preFiltered = useMemo(() => {
    if (preFilter === 'favorite') return enrichedRecipes.filter(r => r.favorite);
    if (preFilter === 'leggero') return enrichedRecipes.filter(r => r.caloriesPerPortion && r.caloriesPerPortion < LEGGERO_THRESHOLD);
    return enrichedRecipes;
  }, [enrichedRecipes, preFilter]);

  // Applica ricerca e categoria
  const filtered = useMemo(() => preFiltered.filter(r => {
    const matchCat = catFilter === 'Tutte' || (r.category || 'Altro') === catFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || r.title?.toLowerCase().includes(q)
      || (r.ingredients || []).some(i => i.nome?.toLowerCase().includes(q))
      || (r.content || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  }), [preFiltered, catFilter, search]);

  function openRecipe(id) { setSelectedId(id); setChecked({}); setView('detail'); }

  function openAddForm() {
    setIsEditing(false);
    setFTitle(''); setFCategory(''); setFUrl('');
    setFProcedimento(''); setFIngredients([]);
    setFPortions('4'); setNewIngNome(''); setNewIngQta('');
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
    setFPortions(String(selectedRecipe.portions || 4));
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

  function removeIngredient(id) {
    setFIngredients(prev => prev.filter(i => i.id !== id));
  }

  async function handleSave(e) {
    e.preventDefault();
    const title = fTitle.trim();
    if (!title) return;
    const portions = Math.max(1, Number(fPortions) || 4);
    const calResult = calculateRecipeCalories(fIngredients, portions);
    const data = {
      title,
      category: fCategory || 'Altro',
      url: fUrl.trim(),
      ingredients: fIngredients,
      procedimento: fProcedimento.trim(),
      portions,
      caloriesPerPortion: calResult?.perPortion ?? null,
      caloriesTotal: calResult?.total ?? null,
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
      setView('list'); setSelectedId(null);
    } catch (err) { console.error(err); }
  }

  async function toggleFavorite() {
    if (!selectedRecipe) return;
    try {
      await updateDoc(doc(db, 'recipes', selectedRecipe.id), { favorite: !selectedRecipe.favorite });
    } catch (err) { console.error(err); }
  }

  // Analizza il testo del procedimento e pre-compila il form
  function importFromText() {
    if (!selectedRecipe) return;
    const text = getProcedimento(selectedRecipe);
    const parsed = parseIngredientsFromText(text);
    setIsEditing(true);
    setFTitle(selectedRecipe.title || '');
    setFCategory(selectedRecipe.category || 'Altro');
    setFUrl(selectedRecipe.url || '');
    setFProcedimento(text);
    setFIngredients(parsed);
    setFPortions(String(selectedRecipe.portions || 4));
    setNewIngNome(''); setNewIngQta('');
    setView('form');
  }

  // Migrazione batch: aggiorna tutte le ricette senza ingredienti strutturati
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState(null);

  async function migrateAllRecipes() {
    const toMigrate = recipes.filter(r => !(r.ingredients?.length > 0));
    if (toMigrate.length === 0) { setMigrateResult('Tutte le ricette hanno già ingredienti strutturati.'); return; }
    if (!window.confirm(`Analizzo il testo di ${toMigrate.length} ricette e aggiorno automaticamente ingredienti e calorie. Continuo?`)) return;
    setMigrating(true);
    let ok = 0, skipped = 0;
    for (const r of toMigrate) {
      const text = r.procedimento || r.content || '';
      const ingredients = parseIngredientsFromText(text);
      if (ingredients.length === 0) { skipped++; continue; }
      const portions = r.portions || 4;
      const calResult = calculateRecipeCalories(ingredients, portions);
      try {
        await updateDoc(doc(db, 'recipes', r.id), {
          ingredients,
          portions,
          caloriesPerPortion: calResult?.perPortion ?? null,
          caloriesTotal: calResult?.total ?? null,
        });
        ok++;
      } catch (e) { console.error(e); skipped++; }
    }
    setMigrating(false);
    setMigrateResult(`✅ Aggiornate ${ok} ricette${skipped > 0 ? `, ${skipped} saltate (testo non riconoscibile)` : ''}.`);
  }

  // ── LIST VIEW ──────────────────────────────────────────────
  if (view === 'list') {
    const sectionLabel = preFilter === 'favorite' ? '★ Preferiti' : preFilter === 'leggero' ? '🥗 Leggero (< 400 kcal)' : null;
    const emptyMsg = preFilter === 'favorite'
      ? 'Nessuna ricetta nei preferiti — segna una stella nelle ricette'
      : preFilter === 'leggero'
        ? 'Nessuna ricetta leggera — aggiungi ingredienti con quantità per stimare le calorie'
        : search ? 'Nessuna ricetta trovata' : 'Nessuna ricetta — aggiungine una!';

    return (
      <div className="ricette-root">
        <div className="ricette-top">
          {sectionLabel && <div className="ricette-section-label">{sectionLabel}</div>}
          <div className="ricette-search-bar">
            <IconSearch />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca ricette o ingredienti..."
            />
            {search && <button className="search-clear" onClick={() => setSearch('')}>×</button>}
          </div>
          {!preFilter && (
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
          )}
        </div>

        {/* Banner migrazione batch — solo se ci sono ricette senza ingredienti */}
        {!preFilter && recipes.some(r => !(r.ingredients?.length > 0)) && (
          <div className="migrate-banner">
            <span>
              {migrateResult || `${recipes.filter(r => !(r.ingredients?.length > 0)).length} ricette senza calorie`}
            </span>
            {!migrateResult && (
              <button className="btn btn-primary btn-sm" onClick={migrateAllRecipes} disabled={migrating}>
                {migrating ? 'Analisi...' : '⚡ Calcola tutto'}
              </button>
            )}
          </div>
        )}

        <div className="ricette-list-wrap">
          {filtered.length === 0 ? (
            <div className="empty-state"><p>{emptyMsg}</p></div>
          ) : (
            <ul className="ricette-list">
              {filtered.map(r => {
                const colors = CAT_COLORS[r.category] || CAT_COLORS.Altro;
                return (
                  <li key={r.id} className="ricetta-card" onClick={() => openRecipe(r.id)}>
                    <div className="ricetta-card-body">
                      <span className="ricetta-card-title">{sentenceCase(r.title)}</span>
                      <div className="ricetta-card-badges">
                        <span className="ricetta-cat-badge" style={{ background: colors.bg, color: colors.fg }}>
                          {r.category || 'Altro'}
                        </span>
                        {r.caloriesPerPortion && (
                          <span className={`calorie-badge ${calorieBadgeClass(r.caloriesPerPortion)}`}>
                            🔥 {r.caloriesPerPortion} kcal
                          </span>
                        )}
                      </div>
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

        {!preFilter && <button className="ricette-fab" onClick={openAddForm}>+</button>}
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
          <button className="detail-back" onClick={() => setView('list')}><IconBack /></button>
          <div className="detail-actions">
            <button className={`btn-star ${selectedRecipe.favorite ? 'active' : ''}`} onClick={toggleFavorite}>
              {selectedRecipe.favorite ? '★' : '☆'}
            </button>
            {getIngredients(selectedRecipe).length === 0 && getProcedimento(selectedRecipe) && (
              <button className="btn btn-secondary btn-sm" onClick={importFromText} title="Estrai ingredienti dal testo">
                📥 Analizza
              </button>
            )}
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
              {selectedRecipe.caloriesPerPortion ? (
                <span className={`calorie-badge calorie-badge-lg ${calorieBadgeClass(selectedRecipe.caloriesPerPortion)}`}>
                  🔥 {selectedRecipe.caloriesPerPortion} kcal/porzione
                  {selectedRecipe.portions > 1 && ` · ${selectedRecipe.portions} porzioni`}
                </span>
              ) : (
                <span className="calorie-badge-hint" onClick={openEditForm}>
                  + aggiungi quantità per stimare kcal
                </span>
              )}
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
          <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Nome della ricetta..." required />
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Categoria</label>
            <select value={fCategory} onChange={e => setFCategory(e.target.value)}>
              <option value="">Seleziona...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field form-field-narrow">
            <label>Porzioni</label>
            <input
              type="number"
              min="1"
              max="20"
              value={fPortions}
              onChange={e => setFPortions(e.target.value)}
              className="form-portions-input"
            />
          </div>
        </div>

        <div className="form-field">
          <label>URL ricetta (opzionale)</label>
          <input value={fUrl} onChange={e => setFUrl(e.target.value)} placeholder="https://..." type="url" />
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
          {previewCal && (
            <div className={`cal-preview ${calorieBadgeClass(previewCal.perPortion)}`}>
              🔥 ~{previewCal.perPortion} kcal/porzione · {previewCal.total} kcal totali
            </div>
          )}
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
}
