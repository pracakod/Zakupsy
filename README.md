# 🛒 Zakupsy

Nowoczesna aplikacja do zarządzania listami zakupów zbudowana w Next.js 15, Tailwind CSS v4 i Supabase.

## Funkcje

- ✅ Autentykacja (logowanie / rejestracja e-mail + hasło)
- ✅ Tworzenie i usuwanie list zakupowych
- ✅ Dodawanie i usuwanie produktów
- ✅ Odhaczanie produktów (checkbox + przekreślenie + przeniesienie na dół)
- ✅ Pasek postępu zakupów
- ✅ **Realtime** – lista odświeża się automatycznie na wszystkich urządzeniach
- ✅ Mobile First – wygląda jak natywna aplikacja mobilna
- ✅ **Społeczność** – system znajomych, zaproszenia i akceptacja
- ✅ **Czat Realtime** – prywatna komunikacja ze znajomymi
- ✅ **Udostępnianie** – szybkie współdzielenie list z wybranymi osobami
- ✅ **Uczestnicy** – widoczność wszystkich osób mających dostęp do listy
- ✅ **Mobile First** – interfejs zoptymalizowany pod urządzenia mobilne (bottom sheets, animacje)
- ✅ **Trwałość** – zapisywanie własnych alejek i preferencji w profilu
- ✅ Ciemny motyw i premium design

---

## 1. Konfiguracja Supabase

### 1.1. Utwórz projekt

1. Wejdź na [supabase.com](https://supabase.com) i utwórz konto
2. Kliknij **New Project** i wypełnij dane

### 1.2. Utwórz tabele w bazie danych

Wejdź w **SQL Editor** i wykonaj poniższe zapytanie:

```sql
-- Tabela list zakupowych
CREATE TABLE lists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Tabela produktów
CREATE TABLE items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  list_id uuid REFERENCES lists(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  is_completed boolean DEFAULT false NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Row Level Security (RLS) - każdy widzi tylko swoje dane
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Użytkownicy zarządzają własnymi listami" ON lists
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Użytkownicy zarządzają własnymi produktami" ON items
  FOR ALL USING (auth.uid() = user_id);

-- Tabele Społecznościowe (Dodatkowe)
-- Tabela zaproszeń do znajomych
CREATE TABLE friend_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_email text NOT NULL,
    status text DEFAULT 'pending'
);

-- Tabela udostępnionych list
CREATE TABLE list_shares (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    list_id uuid REFERENCES lists(id) ON DELETE CASCADE,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    invited_by uuid REFERENCES profiles(id) ON DELETE CASCADE
);

-- Tabela wiadomości (czat)
CREATE TABLE messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Nie zapomnij włączyć RLS i dodać odpowiednich polityk (Policies) dla tych tabel!
```

### 1.3. Włącz Realtime

W Supabase Dashboard:
1. Wejdź w **Database → Replication**
2. W sekcji **Supabase Realtime** włącz tabele `lists` i `items`

### 1.4. Pobierz klucze API

W Supabase Dashboard: **Settings → API**

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. Konfiguracja aplikacji

### 2.1. Sklonuj projekt i zainstaluj zależności

```bash
cd listify-app
npm install
```

### 2.2. Skonfiguruj zmienne środowiskowe

Skopiuj przykładowy plik i uzupełnij własnymi kluczami:

```bash
cp .env.local.example .env.local
```

Otwórz `.env.local` i wpisz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=twoj-anon-key
```

### 2.3. Uruchom aplikację

```bash
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000)

---

## 3. Struktura projektu

```
listify-app/
├── app/
│   ├── layout.tsx          # Root layout z fontami
│   ├── globals.css         # Style globalne + Tailwind v4 theme
│   ├── page.tsx            # Redirect → /lists
│   ├── auth/
│   │   └── page.tsx        # Strona logowania/rejestracji
│   └── lists/
│       ├── page.tsx        # Lista wszystkich list (Server Component)
│       └── [id]/
│           └── page.tsx    # Szczegóły listy z produktami (Server Component)
├── components/
│   ├── AuthForm.tsx        # Formularz logowania/rejestracji
│   ├── ListsClient.tsx     # Dashboard list z Realtime
│   ├── ShoppingListClient.tsx # Widok listy z produktami + Realtime
│   └── ListItem.tsx        # Pojedynczy produkt (checkbox, usuń)
├── lib/
│   └── supabase/
│       ├── client.ts       # Klient przeglądarkowy (createBrowserClient)
│       └── server.ts       # Klient serwerowy (createServerClient)
├── types/
│   └── index.ts            # Typy TypeScript (ShoppingList, Item)
├── middleware.ts            # Ochrona tras + odświeżanie sesji
└── .env.local.example      # Przykładowe zmienne środowiskowe
```

---

## 4. Deploy na Vercel

```bash
npm install -g vercel
vercel
```

W ustawieniach projektu na Vercel dodaj zmienne środowiskowe:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

W Supabase Dashboard → **Authentication → URL Configuration** dodaj:
- Site URL: `https://twoja-domena.vercel.app`
- Redirect URLs: `https://twoja-domena.vercel.app/**`

---

## Technologie

| Tech | Wersja | Rola |
|------|--------|------|
| Next.js | 15 (App Router) | Framework |
| TypeScript | 5 | Typy |
| Tailwind CSS | v4 | Stylizacja |
| Supabase | 2.x | Auth + DB + Realtime |
| Lucide React | latest | Ikony |

---

## 5. Jak wrzucić na GitHub?

Jeśli chcesz wypchnąć swój kod do nowo utworzonego repozytorium:

```bash
# 1. Zainicjuj gita (jeśli jeszcze nie zrobiłeś)
git init

# 2. Dodaj wszystkie pliki
git add .

# 3. Zrób pierwszy commit
git commit -m "Uruchomienie modułu społecznościowego i czatu"

# 4. Sprawdź czy remote jest ustawiony na Twoje repozytorium
git remote add origin https://github.com/pracakod/Zakupsy.git

# 5. Wypchnij kod
git branch -M main
git push -u origin main
```

Twoja aplikacja jest gotowa do pokazania światu! 🚀
