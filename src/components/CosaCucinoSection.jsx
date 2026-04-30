import { useState, useMemo } from 'react';

function sentenceCase(str) {
  if (!str) return '';
  const s = str.trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

const IconBack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconChevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const CAT_COLORS = {
  Antipasti: { bg: '#fffbeb', fg: '#b45309' },
  Primi:     { bg: '#eff6ff', fg: '#1d4ed8' },
  Secondi:   { bg: '#f0fdf4', fg: '#15803d' },
  Dolci:     { bg: '#fdf2f8', fg: '#be185d' },
  Altro:     { bg: '#f3f4f6', fg: '#374151' },
};

export default function CosaCucinoSection({ recipes, onOpenRecipe }) {
  const [selected, setSelected] = useState(new Set());

  // Raccoglie tutti gli ingredienti unici da tutte le ricette
  const allIngredients = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const r of recipes) {
      for (const ing of (r.ingredients || [])) {
        const key = ing.nome?.toLowerCase().trim();
        if (key && !seen.has(key)) { seen.add(key); list.push(ing.nome.trim()); }
      }
    }
    return list.sort((a, b) => a.localeCompare(b, 'it'));
  }, [recipes]);

  function toggle(nome) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(nome) ? next.delete(nome) : next.add(nome);
      return next;
    });
  }

  // Ricette filtrate con conteggio match
  const matches = useMemo(() => {
    if (selected.size === 0) return [];
    const selLower = [...selected].map(s => s.toLowerCase().trim());
    return recipes
      .filter(r => (r.ingredients || []).length > 0)
      .map(r => {
        const ingNames = (r.ingredients || []).map(i => i.nome?.toLowerCase().trim());
        const found = selLower.filter(s => ingNames.includes(s)).length;
        return { recipe: r, found, total: ingNames.length };
      })
      .filter(m => m.found > 0)
      .sort((a, b) => b.found / b.total - a.found / a.total);
  }, [recipes, selected]);

  const full = matches.filter(m => m.found === m.total);
  const partial = matches.filter(m => m.found < m.total);

  return (
    <div className="cucino-root">
      <div className="cucino-top">
        <p className="cucino-subtitle">Seleziona gli ingredienti che hai in casa</p>
        {selected.size > 0 && (
          <button className="cucino-clear" onClick={() => setSelected(new Set())}>
            Cancella selezione ({selected.size})
          </button>
        )}
      </div>

      {allIngredients.length === 0 ? (
        <div className="empty-state">
          <p>Aggiungi ingredienti alle ricette per usare questa funzione</p>
        </div>
      ) : (
        <>
          <div className="cucino-chips-wrap">
            <div className="cucino-chips">
              {allIngredients.map(nome => (
                <button
                  key={nome}
                  className={`cucino-chip ${selected.has(nome) ? 'selected' : ''}`}
                  onClick={() => toggle(nome)}
                >
                  {nome}
                </button>
              ))}
            </div>
          </div>

          {selected.size > 0 && (
            <div className="cucino-results">
              {matches.length === 0 ? (
                <div className="empty-state"><p>Nessuna ricetta con questi ingredienti</p></div>
              ) : (
                <>
                  {full.length > 0 && (
                    <section>
                      <div className="cucino-results-label">Puoi fare subito ({full.length})</div>
                      <ul className="ricette-list">
                        {full.map(({ recipe: r }) => {
                          const colors = CAT_COLORS[r.category] || CAT_COLORS.Altro;
                          return (
                            <li key={r.id} className="ricetta-card" onClick={() => onOpenRecipe(r.id)}>
                              <div className="ricetta-card-body">
                                <span className="ricetta-card-title">{sentenceCase(r.title)}</span>
                                <span className="ricetta-cat-badge" style={{ background: colors.bg, color: colors.fg }}>
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
                    </section>
                  )}

                  {partial.length > 0 && (
                    <section>
                      <div className="cucino-results-label cucino-results-label-partial">
                        Quasi (mancano alcuni ingredienti)
                      </div>
                      <ul className="ricette-list">
                        {partial.map(({ recipe: r, found, total }) => {
                          const colors = CAT_COLORS[r.category] || CAT_COLORS.Altro;
                          const missing = (r.ingredients || [])
                            .map(i => i.nome?.trim())
                            .filter(n => n && !selected.has(n));
                          return (
                            <li key={r.id} className="ricetta-card" onClick={() => onOpenRecipe(r.id)}>
                              <div className="ricetta-card-body">
                                <span className="ricetta-card-title">{sentenceCase(r.title)}</span>
                                <div className="ricetta-card-badges">
                                  <span className="ricetta-cat-badge" style={{ background: colors.bg, color: colors.fg }}>
                                    {r.category || 'Altro'}
                                  </span>
                                  <span className="match-badge">{found}/{total}</span>
                                </div>
                                <span className="cucino-missing">
                                  Manca: {missing.slice(0, 3).join(', ')}{missing.length > 3 ? ` +${missing.length - 3}` : ''}
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
                    </section>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
