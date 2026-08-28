"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CURRENCIES, convert, type CurrencyCode } from "@/lib/currency";
import { dictionaries, type Locale } from "@/lib/i18n";

export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  compareAtPrice: string | null;
  dealPrice: string | null;
  dealEndsAt: string | null;
  sku: string | null;
  stock: number;
  categoryId: number | null;
  images: string[];
  specs: Record<string, string>;
  rating: string;
  reviewCount: number;
  featured: boolean;
  isDeal: boolean;
  isActive: boolean;
};

export type CartLine = { id: number; quantity: number; product: Product };
export type WishlistLine = { id: number; product: Product };

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  emailVerified: boolean;
};

type Toast = { id: number; message: string; type: "success" | "error" | "info" };

type AppContextValue = {
  user: AuthUser | null;
  authLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;

  cart: CartLine[];
  cartLoading: boolean;
  cartCount: number;
  cartSubtotal: number;
  addToCart: (productId: number, quantity?: number) => Promise<void>;
  updateCartQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeCartItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;

  wishlist: WishlistLine[];
  isWishlisted: (productId: number) => boolean;
  toggleWishlist: (productId: number) => Promise<void>;
  refreshWishlist: () => Promise<void>;

  locale: Locale;
  setLocale: (l: Locale) => void;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  t: (key: string) => string;
  formatPrice: (usdAmount: number | string) => string;

  toasts: Toast[];
  showToast: (message: string, type?: Toast["type"]) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [wishlist, setWishlist] = useState<WishlistLine[]>([]);
  const [locale, setLocaleState] = useState<Locale>("en");
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const refreshCart = useCallback(async () => {
    setCartLoading(true);
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      setCart(data.items ?? []);
    } finally {
      setCartLoading(false);
    }
  }, []);

  const refreshWishlist = useCallback(async () => {
    try {
      const res = await fetch("/api/wishlist");
      const data = await res.json();
      setWishlist(data.items ?? []);
    } catch {
      setWishlist([]);
    }
  }, []);

  useEffect(() => {
    const savedLocale = (localStorage.getItem("sc_locale") as Locale | null) ?? "en";
    const savedCurrency = (localStorage.getItem("sc_currency") as CurrencyCode | null) ?? "USD";
    setLocaleState(savedLocale);
    setCurrencyState(savedCurrency);
    document.documentElement.lang = savedLocale;
    document.documentElement.dir = savedLocale === "ar" ? "rtl" : "ltr";

    refreshUser();
    refreshCart();
    refreshWishlist();
  }, [refreshUser, refreshCart, refreshWishlist]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("sc_locale", l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  }, []);

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    localStorage.setItem("sc_currency", c);
  }, []);

  const addToCart = useCallback(
    async (productId: number, quantity = 1) => {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await res.json();
      if (res.ok) {
        setCart(data.items ?? []);
        showToast("Added to cart", "success");
      } else {
        showToast(data.error ?? "Could not add to cart", "error");
      }
    },
    [showToast],
  );

  const updateCartQuantity = useCallback(async (itemId: number, quantity: number) => {
    const res = await fetch("/api/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, quantity }),
    });
    const data = await res.json();
    if (res.ok) setCart(data.items ?? []);
  }, []);

  const removeCartItem = useCallback(
    async (itemId: number) => {
      const res = await fetch(`/api/cart?itemId=${itemId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setCart(data.items ?? []);
        showToast("Removed from cart", "info");
      }
    },
    [showToast],
  );

  const clearCart = useCallback(async () => {
    const res = await fetch("/api/cart?clear=true", { method: "DELETE" });
    const data = await res.json();
    if (res.ok) setCart(data.items ?? []);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setWishlist([]);
    await refreshCart();
    showToast("Logged out", "info");
  }, [refreshCart, showToast]);

  const isWishlisted = useCallback(
    (productId: number) => wishlist.some((w) => w.product.id === productId),
    [wishlist],
  );

  const toggleWishlist = useCallback(
    async (productId: number) => {
      if (!user) {
        showToast("Please login to use wishlist", "error");
        return;
      }
      if (isWishlisted(productId)) {
        const res = await fetch(`/api/wishlist?productId=${productId}`, { method: "DELETE" });
        const data = await res.json();
        if (res.ok) {
          setWishlist(data.items ?? []);
          showToast("Removed from wishlist", "info");
        }
      } else {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        const data = await res.json();
        if (res.ok) {
          setWishlist(data.items ?? []);
          showToast("Added to wishlist", "success");
        }
      }
    },
    [isWishlisted, showToast, user],
  );

  const t = useCallback((key: string) => dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key, [locale]);

  const formatPrice = useCallback(
    (usdAmount: number | string) => {
      const amount = typeof usdAmount === "string" ? parseFloat(usdAmount) : usdAmount;
      const c = CURRENCIES[currency] ?? CURRENCIES.USD;
      const value = convert(amount || 0, currency);
      return `${c.symbol}${value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [currency],
  );

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartSubtotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const price =
          item.product.isDeal && item.product.dealPrice
            ? parseFloat(item.product.dealPrice)
            : parseFloat(item.product.price);
        return sum + price * item.quantity;
      }, 0),
    [cart],
  );

  const value: AppContextValue = {
    user,
    authLoading,
    refreshUser,
    logout,
    cart,
    cartLoading,
    cartCount,
    cartSubtotal,
    addToCart,
    updateCartQuantity,
    removeCartItem,
    clearCart,
    refreshCart,
    wishlist,
    isWishlisted,
    toggleWishlist,
    refreshWishlist,
    locale,
    setLocale,
    currency,
    setCurrency,
    t,
    formatPrice,
    toasts,
    showToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
