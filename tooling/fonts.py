"""
Convierte las fuentes de Andika (TTF de SIL) en los WOFF2 que publica el sitio.

- Recorta a los alfabetos latinos (galego, castellano, portugués) y la
  puntuación: de ~750 KB a unas decenas de KB por fichero.
- Cambia el nombre interno de la familia a "Caderno Letra": la licencia OFL
  reserva el nombre "Andika" para la versión original, y un recorte es una
  versión modificada.

Uso (necesita fontTools y brotli: `pip install fonttools brotli`):

    python3 tooling/fonts.py tooling/fonts-src

`tooling/fonts-src/` tiene Andika-Regular.ttf, -Italic.ttf y -Bold.ttf (descargados de
https://software.sil.org/andika/). Escribe los .woff2 en src/assets/fonts/.
Los TTF no se versionan (`*.ttf` en .gitignore).
"""

import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

FAMILY = "Caderno Letra"
UNICODES = "U+0000-024F,U+1E00-1EFF,U+2000-206F,U+20AC"
FACES = {"Regular": "regular", "Italic": "italic", "Bold": "bold"}
OUT = Path(__file__).resolve().parent.parent / "src" / "assets" / "fonts"


def rename(font: TTFont, style: str) -> None:
    """Sustituye el nombre de la familia en la tabla `name` (IDs 1, 3, 4, 6, 16 y 21)."""
    full = f"{FAMILY} {style}"
    postscript = f"{FAMILY.replace(' ', '')}-{style}"
    values = {1: FAMILY, 3: postscript, 4: full, 6: postscript, 16: FAMILY, 21: FAMILY}
    for record in font["name"].names:
        if record.nameID in values:
            record.string = values[record.nameID]


def convert(src_dir: Path) -> None:
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.notdef_outline = True
    unicodes = subset.parse_unicodes(UNICODES)
    for style, slug in FACES.items():
        font = TTFont(src_dir / f"Andika-{style}.ttf")
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=unicodes)
        subsetter.subset(font)
        rename(font, style)
        target = OUT / f"caderno-letra-{slug}.woff2"
        font.flavor = "woff2"
        font.save(target)
        print(f"{target.name}: {target.stat().st_size // 1024} KB")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    convert(Path(sys.argv[1]))
