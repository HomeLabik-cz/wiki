# HomeLabik.cz Wiki 📚

Naše oficiální komunitní wiki pro 🇨🇿 🇸🇰 nadšence do homelabu.

---

## 🛠️ Lokální vývoj a spuštění

### Požadavky
- [Hugo](https://gohugo.io/installation/) v0.162.1+extended nebo vyšší.
- [Python](https://www.python.org/) v3.10 nebo vyšší s balíčkem `pyyaml` pro běh validačních skriptů.

### 1. Klonování repozitáře
```bash
git clone https://github.com/HomeLabik-cz/wiki.git
cd wiki
```

### 2. Spuštění serveru
```bash
hugo server -D
```
Web bude dostupný na adrese `http://localhost:1313/`.

### 3. Validace aplikací
```bash
# Instalace závislostí pro validační skript
pip install pyyaml

# Validace všech YAML souborů v data/apps/
python3 scripts/validate_apps.py
```

---

## 📁 Struktura projektu

```text
├── content/              # Markdown obsah stránek a návodů
│   ├── _index.md         # Úvodní stránka wiki
│   ├── apps/             # Sekce katalogu aplikací
│   ├── contributing.md   # Jak přispívat do wiki
│   └── kategorie/        # Návody a články (mohou být vnořené)
│       └── podkategorie/
│           └── navod.md
├── data/
│   └── apps/             # YAML soubory jednotlivých aplikací
├── layouts/              # Hugo HTML šablony
├── static/               # Statické soubory (CSS, JS, obrázky, ikony)
├── scripts/              # Pomocné Python skripty
│   └── validate_apps.py  # Validace aplikací
├── .github/              # GitHub Actions workflows a šablony issues
└── hugo.yaml             # Hlavní konfigurace webu
```

---

## 🤝 Jak přispět

Máš tip na skvělou aplikaci nebo chceš sepsat návod? Zapojit se může každý:

1. **Navržení nové aplikace**: Vyplň [Issue pro přidání aplikace](../../issues/new?template=add_app.yml).
2. **Odstranění aplikace**: Pokud je nějaká aplikace neaktuální nebo nefunkční, vyplň [Issue pro odstranění aplikace](../../issues/new?template=remove_app.yml).
3. **Ruční přidání přes PR**: Přidej nový soubor `data/apps/<nazev-aplikace>.yml` a pošli Pull Request.

---

## 📄 Licence

Tento projekt je otevřený pod licencí MIT.
