# Prompt Squad — design system & stack brief (for AI agents)

Use this document when **porting UI** to another app or **generating screens** that should match this project’s look, tokens, and technical patterns.

---

## 1. Tech stack (versions are from this repo; align new apps to Expo’s supported matrix)

| Layer | Choice |
|--------|--------|
| **Language** | TypeScript (strict) |
| **UI framework** | **React Native** + **React Native Web** (single codebase for iOS / Android / web) |
| **Runtime** | **React 19.x**, **React Native 0.81.x** |
| **App shell & routing** | **Expo SDK ~54**, **expo-router** (file-based routes, `app/` directory) |
| **Styling** | `StyleSheet.create`, inline objects; **no** Tailwind in core UI (tokens are TS modules) |
| **Animations** | **react-native-reanimated** (~4.x), **react-native-worklets** |
| **Gestures** | **react-native-gesture-handler** |
| **Safe area** | **react-native-safe-area-context** |
| **Images** | **expo-image** |
| **Fonts** | **expo-font** + **@expo-google-fonts/figtree** + **@expo-google-fonts/abyssinica-sil** |
| **Icons** | **hugeicons-react-native** (wrapped by app `Icon` component) |
| **Shadows (native)** | **react-native-shadow-2** (where used); design tokens also expose `shadowToNative()` |
| **Backend / auth (this app)** | **Supabase** (`@supabase/supabase-js`), Edge Functions (Deno) |
| **Web deploy** | **expo export -p web** → static output; often hosted on **Vercel** (`vercel.json` + `dist`) |
| **State / prefs** | **@react-native-async-storage/async-storage** (pattern in this app) |

**Path alias:** `@/*` → `./src/*` (see `tsconfig.json`).

---

## 2. Design system layout (what to copy or mirror)

All design tokens and theme live under **`src/design-system/`**:

| File / area | Responsibility |
|-------------|----------------|
| **`theme.tsx`** | `ThemeProvider`, `useTheme()`, light/dark mode from user preferences |
| **`tokens/light.ts`** | `lightColors` — semantic + brand + mascot palette |
| **`tokens/dark.ts`** | `darkColors` — dark equivalents |
| **`tokens/typography.ts`** | `fontFamilies`, `textStyles` (h1–h3, body, label, button, card title, etc.) |
| **`tokens/shadows.ts`** | Named shadows (`xs` … `3xl`), skeuomorphic presets, **`shadowToCSS`**, **`shadowToNative`**, **`skeuToCSS`**, **`skeuToGradient`** |
| **`index.ts`** | Re-exports |

**Consumption pattern:** `import { useTheme, fontFamilies, textStyles, shadowToCSS, shadowToNative } from '@/design-system'` (or relative path in a new repo).

---

## 3. Color system (semantic)

**Light mode highlights** (`lightColors`):

- **Background / surface:** `background` `#FFFFFF`, `surface` `#F5F5F5`, `outline` `#D9D9D9`
- **Text:** `text` `#212121`, `textMuted` `#898989`
- **Brand:** `primary` `#3F31B4`, `primaryHover` `#2F2777`, `primaryBg` `#E0DFEA`
- **Dark UI chrome:** `darkButton` `#323232`, `darkButtonHover` `#1B1B1B`
- **Accents:** mascot family keys (`yellow`, `red`, `green`, `pink`, `purple`, `teal`, `blue`, …) + `*Light` variants

**Dark mode** mirrors semantics in `darkColors` (e.g. `background` `#1D1D1D`, adjusted `primary`, etc.).

**Rule for agents:** Prefer **`colors.*` from `useTheme()`** over hard-coded hex in components so light/dark stay correct.

---

## 4. Typography

- **Primary UI font:** **Figtree** — `Figtree_400Regular`, `Figtree_500Medium`, `Figtree_600SemiBold`
- **Display / card titles:** **Abyssinica SIL** — `AbyssinicaSIL_400Regular` (see `textStyles.cardTitle`)

**`textStyles`** exposes ready-made `fontFamily`, `fontSize`, `lineHeight`, `letterSpacing` for: `h1`, `h2`, `h3`, `cardTitle`, `body`, `message`, `label`, `subtitle`, `caption`, `button`, `miniButton`.

**Loading fonts (Expo):** `useFonts` in root layout with `@expo-google-fonts/*` imports; gate app on `fontsLoaded` before UI.

---

## 5. Shadows & elevation

- **Token names:** `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl` — multi-layer definitions in `shadows.ts`.
- **Web:** `shadowToCSS('md')` → single `boxShadow` string; often cast as `as unknown as object` on `View` style.
- **iOS/Android:** `shadowToNative('md')` → `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation`.
- **Skeuomorphic buttons:** `skeuomorphicEffects` + `skeuToCSS` (web) / `skeuToGradient` + `shadowToNative` (native approximation).

**Rule for agents:** On **web**, use **`boxShadow` + CSS string** from tokens; on **native**, use **`shadowToNative`** or `react-native-shadow-2` where the codebase already does.

---

## 6. Component inventory (UI building blocks)

These live under **`src/components/`** and are exported from **`src/components/index.ts`**:

**Buttons & actions**

- `BigPrimaryButton`, `BigSecondaryButton`, `MediumDarkButton`, `MiniButton`, `TextButton`, `IconButton`

**Form & chrome**

- `InputField`, `SegmentedToggle`, `ColoredTab`, `LinkPill`

**Layout / marketing / app shell**

- `HomeHeader`, `ChatInputBox`, `PaywallModal`, `UpgradeModal`, `FormattedText`

**Icons**

- `Icon` — named map over **hugeicons-react-native** (`home`, `user`, `store`, `globe`, `send`, …)

**Domain-specific (optional to port)**

- Mascot/chat: `MascotCard`, `MascotDetails`, `ChatHeader`, `ChatHistory`, decks, etc.

**Rule for agents:** Reuse these patterns (sizes, border radius, `fontFamilies.figtree.*`, `colors.primary`) when rebuilding; **copy components + design-system** together for fidelity.

---

## 7. Cross-platform conventions (web vs native)

- **`Platform.OS === 'web'`** — `cursor`, `boxShadow`, `filter` (e.g. grayscale), `transition` strings, `onHoverIn` / `onHoverOut` on `Pressable`.
- **React 19 + RN Web:** Avoid passing **array `style`** into **`Link` + `asChild`** children that forward to DOM; **`StyleSheet.flatten([...])`** for those cases.
- **Safe area:** `SafeAreaView` / `useSafeAreaInsets` for notches and home indicator.

---

## 8. Minimal porting checklist (new app)

1. Copy **`src/design-system/`** (or extract tokens only).
2. Add **Figtree + Abyssinica** via **expo-font** / Google Fonts packages; mirror **`useFonts`** + **`ThemeProvider`** wiring.
3. Copy needed **`src/components/ui/*`** and **`Icon`**; fix imports (`@/` → your alias).
4. Add **hugeicons-react-native** if using `Icon`.
5. Match **Expo + RN + RN Web** versions to a supported **Expo SDK** bundle.
6. For web deploy: **`expo export -p web`**, point static host to output dir, SPA rewrites to `index.html` if applicable.

---

## 9. What this brief does *not* specify

- Product copy, i18n strings, Supabase schema, or Edge Function logic — only **visual/system** alignment and **stack** orientation.
- **EAS / native build** credentials — not covered here.

---

*Generated from the Prompt Squad codebase. Update version pins when you upgrade Expo.*
