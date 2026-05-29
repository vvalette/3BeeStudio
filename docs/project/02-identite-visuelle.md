# 02 — Identité Visuelle

## Logo
Moderne et épuré. Combine l'univers **abeille/ruche** ("Bee" de 3BeeStudio) et le monde de la **tech/design/3D**.

## Palette de Couleurs

```css
:root {
  --slate-950:  #020617;  /* Fond le plus sombre */
  --slate-900:  #0f172a;  /* Fond principal */
  --slate-800:  #1e293b;  /* Surfaces / cartes */
  --slate-700:  #334155;  /* Bordures */
  --slate-400:  #94a3b8;  /* Texte secondaire */
  --slate-200:  #e2e8f0;  /* Texte tertiaire */
  --amber:      #f59e0b;  /* Accent principal — miel/tech */
  --amber-light:#fcd34d;  /* Accent hover */
  --amber-dim:  rgba(245,158,11,0.12); /* Fonds teintés */
  --cream:      #fef9f0;  /* Blanc chaud */
  --white:      #ffffff;
}
```

## Typographie

| Usage | Police | Poids |
|-------|--------|-------|
| Titres / Display | **Syne** | 700, 800 |
| Corps / UI | **DM Sans** | 300, 400, 500 |
| Code / Technique | **JetBrains Mono** | 400 |

Import Google Fonts :
```html
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
```

## Principes Design
- **Dark first** : fond slate sombre, contrastes forts
- **Accent jaune ambré** : rappelle le miel + tech premium
- **Mobile-first** : audience TikTok/Instagram → priorité absolue mobile
- **Animations subtiles** : fadeUp, float, pulse NFC — jamais ostentatoires
- Texture noise overlay à 0.4% d'opacité sur le body (profondeur)
- Grille hexagonale en fond hero (évoque la ruche)

## Composants de base

### Boutons
```tsx
// Primaire (CTA principal)
className="bg-amber-500 hover:bg-amber-300 text-slate-900 font-bold font-syne px-7 py-3 rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-amber"

// Secondaire (outline)
className="border border-slate-700 hover:border-amber-500 hover:text-amber-500 text-white font-syne px-7 py-3 rounded-lg transition-all"
```

### Cartes
```tsx
className="bg-slate-800 border border-slate-700 rounded-2xl hover:border-amber-500/30 hover:-translate-y-1 transition-all"
```
