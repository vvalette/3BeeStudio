# 02 — Identité Visuelle

## Logo
Trois fichiers dans `public/images/` :
- `logo.png` — logo complet (abeille + texte), fond sombre
- `logo-bee-only.png` — abeille seule, fond transparent → utilisé comme favicon (`src/app/icon.png`)
- `logo-name-only.png` — wordmark "3BeeStudio" seul → utilisé dans la Navbar

## Palette de Couleurs

Design system issu du handoff `design_handoff_3beestudio/`. Tokens définis dans `src/styles/globals.css`.

### Backgrounds
| Token Tailwind | CSS var    | Hex        | Usage              |
|---------------|-----------|------------|-------------------|
| `bg-bg-0`     | `--bg-0`  | `#0A0A0B`  | Fond page principal |
| `bg-bg-1`     | `--bg-1`  | `#101013`  | Fond section alterné |
| `bg-bg-2`     | `--bg-2`  | `#161619`  | Cartes             |
| `bg-bg-3`     | `--bg-3`  | `#1C1C20`  | Cartes élevées / chips |
| `bg-bg-4`     | `--bg-4`  | `#25252B`  | Hover              |

### Texte (ink)
| Token Tailwind  | CSS var    | Hex        | Usage              |
|----------------|-----------|------------|-------------------|
| `text-ink-0`   | `--ink-0` | `#FAFAFA`  | Texte primaire     |
| `text-ink-1`   | `--ink-1` | `#C9C9CE`  | Texte secondaire   |
| `text-ink-2`   | `--ink-2` | `#87878E`  | Texte tertiaire    |
| `text-ink-3`   | `--ink-3` | `#54545A`  | Désactivé / meta   |

### Amber (accent)
| Token Tailwind       | Hex        | Usage                    |
|--------------------|------------|--------------------------|
| `text-amber`       | `#F59E0B`  | Accent principal         |
| `text-amber-soft`  | `#FBBF24`  | Highlight / gradient top |
| `text-amber-deep`  | `#B45309`  | Gradient bas / profondeur |

### Bordures (CSS vars uniquement)
```css
--line:       rgba(255,255,255,0.06)   /* bordure subtile */
--line-2:     rgba(255,255,255,0.10)   /* bordure forte */
--line-amber: rgba(245,158,11,0.18)    /* bordure amber */
```

### Gradients utiles
```css
--honey: linear-gradient(180deg, #FCD34D 0%, #F59E0B 50%, #B45309 100%)
--btn-primary-bg: linear-gradient(180deg, #FBBF24 0%, #F59E0B 100%)
--btn-primary-shadow: 0 1px 0 rgba(255,255,255,0.5) inset, 0 8px 24px rgba(245,158,11,0.35)
```

## Typographie

| Usage       | Police          | Variable CSS       | Poids       |
|------------|-----------------|-------------------|-------------|
| Corps / UI | **Manrope**     | `--font-manrope`  | 300–800     |
| Mono / UI  | **JetBrains Mono** | `--font-jetbrains` | 400–600 |

Classes Tailwind : `font-sans` (Manrope) · `font-mono` (JetBrains Mono)

## Border Radius
| Token Tailwind  | px  |
|----------------|-----|
| `rounded-xs`   | 8   |
| `rounded-sm`   | 12  |
| `rounded-md`   | 18  |
| `rounded-lg`   | 24  |
| `rounded-xl`   | 32  |
| `rounded-2xl`  | 40  |
| `rounded-pill` | 999 |

## Shadows
| Token Tailwind    | Usage                        |
|------------------|------------------------------|
| `shadow-card`    | Cartes standard              |
| `shadow-amber`   | Cartes / boutons amber glow  |
| `shadow-pop`     | Éléments en avant-plan       |

## Principes Design
- **Dark first** : fond `#0A0A0B`, jamais de fond blanc sur les pages principales
- **Accent amber** : rappelle le miel + tech premium
- **Mobile-first** : audience TikTok/Instagram → priorité absolue mobile
- **Animations subtiles** : `float`, `fadeUp`, `pulse-dot` — jamais ostentatoires
- Grille hexagonale en fond hero (évoque la ruche)

## Utilitaires CSS (globals.css)
```css
.honey-text   /* gradient amber clippé sur le texte */
.no-scrollbar /* cache la scrollbar */
.fade-up      /* animation entrée vers le haut */
.hex-bg       /* double radial-gradient amber en fond */
.amber-ring   /* bordure gradient amber via mask */
```

## Bouton primaire
```tsx
<button
  className="flex h-[52px] items-center justify-center gap-2 rounded-pill font-sans font-semibold text-[15px] text-[#1A1300] transition-all active:scale-[0.97]"
  style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
>
  Texte du bouton
</button>
```

## Bouton secondaire / ghost
```tsx
<button className="flex h-[52px] items-center justify-center rounded-pill font-sans font-semibold text-[15px] text-ink-0 border border-[var(--line-2)] bg-bg-3 transition-all active:scale-[0.97] hover:bg-bg-4">
  Texte
</button>
```

## Carte standard
```tsx
<div className="rounded-lg border border-[var(--line)] bg-bg-2 p-6" style={{ borderRadius: 24, boxShadow: 'var(--shadow-card)' }}>
  {/* contenu */}
</div>
```
