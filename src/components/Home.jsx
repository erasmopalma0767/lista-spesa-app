import { useMemo } from 'react';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buongiorno';
  if (h < 17) return 'Buon pomeriggio';
  return 'Buonasera';
}

const IconBag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
  </svg>
);

const IconFridge = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="8" y1="6" x2="8" y2="8"/><line x1="8" y1="14" x2="8" y2="18"/>
  </svg>
);

const IconBook = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
  </svg>
);

const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const IconLeaf = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 8C8 10 5.9 16.17 3.82 19.34"/><path d="M22 4c-6 0-12 4-14 10 1.86-1.44 3.96-2.28 6-2.5C17.5 11 20 8 22 4z"/>
  </svg>
);

const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);

export default function Home({ user, notes, recipes, onNavigate }) {
  const greeting = useMemo(() => getGreeting(), []);
  const initial = (user?.displayName?.[0] || user?.email?.[0] || '?').toUpperCase();
  const favCount = recipes.filter(r => r.favorite).length;

  const tiles = [
    {
      id: 'lists',
      label: 'Spesa',
      sub: notes.length > 0 ? `${notes.length} ${notes.length === 1 ? 'lista' : 'liste'}` : 'Nessuna lista',
      emoji: '🛒',
      cls: 'tile-spesa',
      Icon: IconBag,
    },
    {
      id: 'cosa-cucino',
      label: 'Cosa cucino?',
      sub: 'Cerca per ingredienti',
      emoji: '🍳',
      cls: 'tile-cucino',
      Icon: IconFridge,
    },
    {
      id: 'recipes',
      label: 'Ricette',
      sub: recipes.length > 0 ? `${recipes.length} nel ricettario` : 'Nessuna ricetta',
      emoji: '🍅',
      cls: 'tile-ricette',
      Icon: IconBook,
    },
    {
      id: 'preferiti',
      label: 'Preferiti',
      sub: favCount > 0 ? `${favCount} ricette` : 'Nessun preferito',
      emoji: '⭐',
      cls: 'tile-preferiti',
      Icon: IconStar,
    },
    {
      id: 'leggero',
      label: 'Leggero',
      sub: 'Ricette light',
      emoji: '🥗',
      cls: 'tile-leggero',
      Icon: IconLeaf,
    },
    {
      id: 'aggiungi',
      label: 'Aggiungi',
      sub: 'Nuova ricetta',
      emoji: '✍️',
      cls: 'tile-aggiungi',
      Icon: IconPlus,
    },
  ];

  return (
    <div className="home-root">
      <div className="home-header">
        <div>
          <p className="home-greeting-label">{greeting}</p>
          <h2 className="home-greeting-name">Casa Palma 🏠</h2>
        </div>
        <div className="home-avatar">{initial}</div>
      </div>

      <p className="home-subtitle">Cosa vuoi fare oggi?</p>

      <div className="home-grid">
        {tiles.map(({ id, label, sub, emoji, cls, Icon }) => (
          <button key={id} className={`home-tile ${cls}`} onClick={() => onNavigate(id)}>
            <span className="tile-bg-emoji">{emoji}</span>
            <div className="tile-icon-wrap">
              <Icon />
            </div>
            <div className="tile-text">
              <span className="tile-label">{label}</span>
              <span className="tile-sub">{sub}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
