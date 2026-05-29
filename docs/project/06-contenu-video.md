# 06 — Stratégie Contenu & Automatisation Vidéo

## Principe
L'impression 3D est **nativement satisfying à filmer**. Chaque impression = 1 contenu potentiel. Le processus est aussi vendeur que le résultat.

## Phase 1 — Manuel (maintenant)

**Workflow actuel (10 min/vidéo) :**
1. Activer timelapse dans Bambu Studio avant chaque impression
2. Récupérer le `.mp4` à la fin (app Bambu ou carte SD)
3. Importer dans CapCut mobile
4. Appliquer le template 3BeeStudio (9:16, logo, musique)
5. Publier manuellement TikTok + Reels

**Template CapCut à créer une seule fois :**
- Format 9:16 (1080×1920)
- Accélération ×6 sur le timelapse
- Logo 3BeeStudio watermark coin bas-droite
- Texte intro animé : "3BeeStudio 🐝"
- Musique libre de droits ou son TikTok tendance

## Phase 3 — Pipeline Automatisé (Mois 5-6)

```
Impression terminée (Bambu Lab)
        ↓
Timelapse .mp4 auto-généré
        ↓
Google Drive (sync auto via app Bambu)
        ↓
Make détecte nouveau fichier
        ↓
Script Python/FFmpeg :
  · Recadre 9:16
  · Accélère ×6
  · Watermark logo
  · Ajoute musique
        ↓
Dossier Buffer
        ↓
Publication auto TikTok + Reels à 18h
```

## Script FFmpeg (process_timelapse.py)

```python
import subprocess
from datetime import datetime
from pathlib import Path

def process_timelapse(
    input_path: str,
    output_dir: str,
    logo_path: str,
    speed: float = 6.0
) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    output_path = f"{output_dir}/3beestudio_{timestamp}.mp4"

    vf_filter = (
        f"setpts={1/speed}*PTS,"
        "scale=1080:1920:force_original_aspect_ratio=decrease,"
        "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,"
        f"movie={logo_path}[logo];"
        "[in][logo]overlay=W-w-20:H-h-20:format=auto"
    )

    cmd = [
        "ffmpeg", "-i", input_path,
        "-vf", vf_filter,
        "-an",  # Supprime audio original
        "-c:v", "libx264", "-crf", "23", "-preset", "fast",
        "-movflags", "+faststart",
        output_path
    ]

    subprocess.run(cmd, check=True)
    print(f"✅ Vidéo générée : {output_path}")
    return output_path
```

**Environnement :** Python 3.10+ + FFmpeg installé. Tourne sur Mac, PC ou Raspberry Pi 4.

## Calendrier de Publication

| Fréquence | Horaires | Formats |
|-----------|----------|---------|
| 1 vidéo/semaine (Phase 1) | 18h | Timelapse |
| 3-5 vidéos/semaine (Phase 2) | 12h + 18h | Timelapse + Reveal + Coulisses |
| 1 vidéo/jour (Phase 3 auto) | 18h automatique | Tous formats |

**Types de contenus :**
- 🖨️ **Timelapse** : l'impression de bout en bout (satisfying)
- 🎁 **Reveal** : déballage de l'objet fini
- 📱 **Démo NFC** : téléphone s'approche → fiche s'ouvre (fort potentiel viral)
- 🏭 **Coulisses** : l'atelier, les ratés, le processus (construit la confiance)
- 🤝 **Témoignage** : "J'ai fabriqué les porte-clés de [restaurant]"

## Outils par Phase

| Phase | Outil | Coût |
|-------|-------|------|
| 1 (maintenant) | CapCut mobile | 0€ |
| 2 | CapCut Pro | 8€/mois |
| 3 | Make + FFmpeg + Buffer | 15€/mois |
| 3 | Epidemic Sound (musique) | 15€/mois si besoin |

## Monétisation Contenu
- **TikTok Creativity Program** : dès 10k abonnés + 100k vues/30j
- **Instagram Bonus Reels** : sur invitation
- Ces revenus peuvent couvrir une partie du filament
