#!/usr/bin/env python3
"""
QICN v4.8 - Mojibake recovery pass (safe, deterministic)

Scope:
- Repairs known mojibake patterns in src/index.jsx UI/copy text.
- Keeps logic/code structure intact.
- Writes UTF-8 output with LF.
"""

from __future__ import annotations

from collections import Counter
from pathlib import Path
import re
import shutil
from datetime import datetime


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "src" / "index.jsx"
BACKUP_DIR = ROOT / "backups" / "encoding_v48"


def suspicious_counts(text: str) -> Counter[str]:
    chars = [
        "\u00a1", "\u00a9", "\u00ad", "\u00b1", "\u00b3", "\u00ba", "\u00bc",
        "\u0081", "\u0089", "\u008d", "\u0091", "\u0093", "\u009a", "\u009c",
        "\u00e2", "\u00ef", "\u00ce",
    ]
    return Counter({c: text.count(c) for c in chars if text.count(c) > 0})


def replace_char_when_wordlike(text: str, bad: str, good: str) -> str:
    # 1) inside words: e.g., Simulaci³n -> Simulación
    text = re.sub(
        rf"(?<=\w){re.escape(bad)}(?=\w)",
        good,
        text,
        flags=re.UNICODE,
    )
    # 2) word-final before punctuation/space/end: e.g., está. / conexión
    text = re.sub(
        rf"(?<=\w){re.escape(bad)}(?=($|[\s\.,;:!\?\)\]\}}]))",
        good,
        text,
        flags=re.UNICODE,
    )
    # 3) word-start corruption: e.g., ºltimo / ©xito / ³ptimo
    text = re.sub(
        rf"(?<!\w){re.escape(bad)}(?=[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])",
        good,
        text,
        flags=re.UNICODE,
    )
    return text


def fix_text(raw: str) -> str:
    text = raw

    # Common 3-byte mojibake clusters in this repository state.
    text = text.replace("\u00e2\u00ac\u00a2", "\u2022")  # â¬¢ -> •
    text = text.replace("\u00ce\u00a6", "\u03a6")        # Î¦ -> Φ
    text = text.replace("\u00ce\u00a9", "\u03a9")        # Î© -> Ω
    text = text.replace("\u00ce\u00bb", "\u03bb")        # Î» -> λ
    text = text.replace("\u00ce\u00a3", "\u03a3")        # Î£ -> Σ
    text = text.replace("\u00ce\u00e9", "\u03a9")        # Îé -> Ω

    # Common emoji mojibake fragments seen in UI copy.
    text = text.replace("\u00e2\u008f\u00b3", "\u23f3")  # â³ -> ⏳
    text = text.replace("a\u008f", "\u26a0\ufe0f")       # a -> ⚠️
    text = text.replace("S&", "\u2705")                  # S& -> ✅
    text = text.replace("a\u00ef\u00b8\u008f", "\u26a0\ufe0f")   # warning
    text = text.replace("xR\u00ef\u00b8\u008f", "\u26a0\ufe0f")  # warning
    text = text.replace("x:\u00ef\u00b8\u008f", "\u2139\ufe0f")  # info
    text = text.replace("x\u00ef\u00b8\u008f", "\u2022")         # neutral bullet
    text = text.replace("a\"\u00ef\u00b8\u008f", "\u2699\ufe0f") # config
    text = text.replace("\u00ef\u00b8\u008f", "")                # strip residual VS16 fragment

    # Main accent corruption map (lost C3 prefix pattern).
    accent_map = {
        "\u00a9": "\u00e9",  # é
        "\u00ad": "\u00ed",  # í
        "\u00b3": "\u00f3",  # ó
        "\u00ba": "\u00fa",  # ú
        "\u00b1": "\u00f1",  # ñ
        "\u00bc": "\u00fc",  # ü
        "\u0081": "\u00c1",  # Á
        "\u0089": "\u00c9",  # É
        "\u008d": "\u00cd",  # Í
        "\u0091": "\u00d1",  # Ñ
        "\u0093": "\u00d3",  # Ó
        "\u009a": "\u00da",  # Ú
        "\u009c": "\u00dc",  # Ü
    }
    for bad, good in accent_map.items():
        text = replace_char_when_wordlike(text, bad, good)

    # Handle A1 carefully: avoid breaking real inverted exclamation punctuation.
    # Convert only when it behaves like a letter in a word.
    text = replace_char_when_wordlike(text, "\u00a1", "\u00e1")  # á

    # Normalize known labels (current project wording).
    normalize = {
        "Validacion": "Validación",
        "Guia": "Guía",
        "Ontologica": "Ontológica",
        "Nucleo": "Núcleo",
        "Simulacion": "Simulación",
        "Percepcion": "Percepción",
        "Soberania": "Soberanía",
        "Ingenieria": "Ingeniería",
        "Metacognicion": "Metacognición",
        "Configuracion": "Configuración",
        "Conexion": "Conexión",
        "Critico": "Crítico",
        "Accion": "Acción",
        "proyeccion": "proyección",
        "evolucion": "evolución",
    }
    for src, dst in normalize.items():
        text = text.replace(src, dst)

    return text


def main() -> int:
    if not TARGET.exists():
        print(f"[ERROR] Missing target: {TARGET}")
        return 1

    original = TARGET.read_text(encoding="utf-8", errors="strict")
    before = suspicious_counts(original)

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = BACKUP_DIR / f"index.jsx.{stamp}.bak"
    shutil.copy2(TARGET, backup)

    fixed = fix_text(original)
    TARGET.write_text(fixed, encoding="utf-8", newline="\n")
    after = suspicious_counts(fixed)

    print("[INFO] Backup:", backup)
    print("[INFO] Before:", dict(before))
    print("[INFO] After :", dict(after))
    print("[INFO] Changed bytes:", len(original.encode("utf-8")) != len(fixed.encode("utf-8")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
