'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Users, Store, ShoppingBag, Loader2 } from 'lucide-react';
import { globalSearch, GlobalSearchResults } from '@/lib/api';
import { getShopkeeperStatusConfig } from '@/lib/utils';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      Promise.resolve().then(() => {
        setQuery('');
        setResults(null);
      });
    }
  }, [open]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query || query.length < 2) {
      Promise.resolve().then(() => {
        setResults(null);
        setLoading(false);
      });
      return;
    }
    Promise.resolve()
      .then(() => {
        setLoading(true);
        return new Promise<GlobalSearchResults>((resolve, reject) => {
          timerRef.current = setTimeout(() => {
            globalSearch(query).then(resolve, reject);
          }, 300);
        });
      })
      .then((res) => setResults(res))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); if (!open) return; }
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const navigate = useCallback((path: string) => {
    router.push(path);
    onClose();
  }, [router, onClose]);

  const hasResults = results && (results.users.length > 0 || results.shopkeepers.length > 0 || results.orders.length > 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-[#18181f] border border-[#2a2a35] rounded-2xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#2a2a35]">
          {loading ? <Loader2 size={18} className="text-[#6b7280] animate-spin flex-shrink-0" /> : <Search size={18} className="text-[#6b7280] flex-shrink-0" />}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, shopkeepers, orders..."
            className="flex-1 bg-transparent text-white text-sm placeholder-[#4b5563] outline-none"
          />
          <button onClick={onClose} className="p-1 text-[#6b7280] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {!query && (
            <div className="px-4 py-8 text-center text-[#6b7280] text-sm">
              Type to search across users, shopkeepers and orders
            </div>
          )}
          {query && !loading && !hasResults && (
            <div className="px-4 py-8 text-center text-[#6b7280] text-sm">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {hasResults && (
            <div className="p-2">
              {/* Users */}
              {results!.users.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
                    <Users size={12} className="text-[#6b7280]" />
                    <span className="text-[#6b7280] text-[11px] font-semibold uppercase tracking-wider">Users</span>
                  </div>
                  {results!.users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => navigate(`/admin/users?open=${user.id}`)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-[#2a2a35] text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {user.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">{user.name}</div>
                        <div className="text-[#6b7280] text-xs truncate">{user.email}</div>
                      </div>
                      <span className="text-[#6b7280] text-xs shrink-0">{user.id}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Shopkeepers */}
              {results!.shopkeepers.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
                    <Store size={12} className="text-[#6b7280]" />
                    <span className="text-[#6b7280] text-[11px] font-semibold uppercase tracking-wider">Shopkeepers</span>
                  </div>
                  {results!.shopkeepers.map((shop) => {
                    const cfg = getShopkeeperStatusConfig(shop.status);
                    return (
                      <button
                        key={shop.id}
                        onClick={() => navigate(`/admin/shopkeepers?open=${shop.id}`)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-[#2a2a35] text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {shop.shopName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">{shop.shopName}</div>
                          <div className="text-[#6b7280] text-xs truncate">{shop.location}</div>
                        </div>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Orders */}
              {results!.orders.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
                    <ShoppingBag size={12} className="text-[#6b7280]" />
                    <span className="text-[#6b7280] text-[11px] font-semibold uppercase tracking-wider">Orders</span>
                  </div>
                  {results!.orders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => navigate(`/admin/orders?open=${order.id}`)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-[#2a2a35] text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#2a2a35] flex items-center justify-center flex-shrink-0">
                        <ShoppingBag size={14} className="text-[#6b7280]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium">{order.id}</div>
                        <div className="text-[#6b7280] text-xs truncate">{order.shopkeeperName}</div>
                      </div>
                      <span className="text-[#6b7280] text-xs shrink-0">{order.userName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
