import { useState, useRef, useEffect, useMemo, type FC } from 'react';
import { Search, X, Sparkles, Music, Globe } from 'lucide-react';
import type { BlobInstanceData, CountryEntry } from '../../types';

interface SearchBarProps {
  blobs: BlobInstanceData[];
  countries: CountryEntry[];
  onSelectBlob: (blob: BlobInstanceData) => void;
  onSurpriseMe: () => void;
}

function getCountryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const codePoints = [...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

interface SearchItem {
  id: string;
  type: 'artist' | 'country';
  title: string;
  subtitle: string;
  flag: string;
  blob?: BlobInstanceData;
}

export const SearchBar: FC<SearchBarProps> = ({
  blobs,
  countries,
  onSelectBlob,
  onSurpriseMe,
}) => {
  const [query, setQuery] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter matching artists & countries
  const searchResults: SearchItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const items: SearchItem[] = [];
    const seenArtists = new Set<string>();

    // 1. Match Blobs (Artists)
    for (const b of blobs) {
      if (seenArtists.has(b.artist.id)) continue;
      const nameMatch = b.artist.name.toLowerCase().includes(q);
      const genreMatch = (b.artist.genres || []).some((g) => g.toLowerCase().includes(q));

      if (nameMatch || genreMatch) {
        seenArtists.add(b.artist.id);
        items.push({
          id: `artist-${b.artist.id}`,
          type: 'artist',
          title: b.artist.name,
          subtitle: `#${b.rank} in ${b.country.name}${b.artist.genre ? ` • ${b.artist.genre}` : ''}`,
          flag: getCountryFlag(b.country.code),
          blob: b,
        });
      }
      if (items.length >= 8) break;
    }

    // 2. Match Countries
    for (const c of countries) {
      const codeMatch = c.code.toLowerCase() === q;
      const nameMatch = c.name.toLowerCase().includes(q);
      if (codeMatch || nameMatch) {
        const countryBlob = blobs.find((b) => b.country.code === c.code && b.rank === 1) ||
                            blobs.find((b) => b.country.code === c.code);
        items.push({
          id: `country-${c.code}`,
          type: 'country',
          title: c.name,
          subtitle: `${c.artists?.length || 0} charting artists • ${c.code}`,
          flag: getCountryFlag(c.code),
          blob: countryBlob,
        });
      }
      if (items.length >= 12) break;
    }

    return items.slice(0, 8);
  }, [query, blobs, countries]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: SearchItem) => {
    if (item.blob) {
      onSelectBlob(item.blob);
    }
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        handleSelect(searchResults[selectedIndex]);
      } else if (searchResults.length > 0) {
        handleSelect(searchResults[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative pointer-events-auto flex items-center gap-2">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
          <Search className="w-4 h-4 text-sky-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search artist, country..."
          className="w-44 sm:w-60 md:w-72 pl-9 pr-8 py-2 rounded-2xl glass-panel text-xs text-white placeholder-slate-400 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400/50 transition-all border border-white/15"
        />

        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-2.5 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* "Surprise Me" Button */}
      <button
        onClick={onSurpriseMe}
        className="glass-btn px-3.5 py-2 rounded-2xl text-xs font-extrabold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 shadow-md border border-amber-400/30"
        title="Fly to a random artist across the globe"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden sm:inline">Surprise Me</span>
      </button>

      {/* Autocomplete Dropdown */}
      {isOpen && searchResults.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 glass-panel rounded-2xl p-1.5 shadow-2xl border border-white/20 z-50 flex flex-col gap-1 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 bg-slate-950/90 backdrop-blur-md">
          {searchResults.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition-colors ${
                  isSelected
                    ? 'bg-sky-500/20 text-white border border-sky-400/30'
                    : 'text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className="text-base shrink-0">{item.flag}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-white truncate max-w-[170px]">
                      {item.title}
                    </span>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 shrink-0">
                      {item.type}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {item.subtitle}
                  </div>
                </div>
                {item.type === 'artist' ? (
                  <Music className="w-3.5 h-3.5 text-sky-400 shrink-0 opacity-60" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0 opacity-60" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
