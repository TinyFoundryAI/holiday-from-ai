#!/usr/bin/env python3
"""Regenerate DICTIONARY.md from extension/themes/analog-life.json.

Re-run after any dictionary edit to keep the human-readable review doc in sync.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(HERE, 'extension/themes/analog-life.json')
MD_PATH = os.path.join(HERE, 'DICTIONARY.md')


PROPER_NOUNS_PEOPLE = {
    'Sam Altman', 'Dario Amodei', 'Jensen Huang', 'Elon Musk',
    'Demis Hassabis', 'Mark Zuckerberg', 'Sundar Pichai', 'Yann LeCun',
    'Geoffrey Hinton', 'Aravind Srinivas', 'Andrew Ng', 'Mustafa Suleyman',
}

PRODUCTS = {
    'GPT-4', 'GPT-5', 'Claude', 'Claude Sonnet', 'Claude Opus', 'Gemini',
    'Mistral', 'Llama', 'DeepSeek', 'Perplexity', 'Cursor', 'Copilot',
    'Midjourney', 'Anthropic', 'OpenAI', 'Meta AI', 'Scale AI', 'Cohere',
    'Lovable', 'Bolt', 'Replit', 'v0', 'Hugging Face', 'ChatGPT',
    'xAI', 'Sonnet', 'Haiku', 'Opus', 'Mythos',
    'MCP', 'MCPs', 'RLHF', 'RAG', 'LangGraph', 'LangChain', 'SWE-bench',
    'Model Context Protocol',
}

ACRONYMS_CORE = {'AI', 'AGI', 'ASI', 'LLM', 'LLMs', 'GPU', 'LRM', 'LRMs', 'o1', 'o3'}

FRENCH_EXPLICIT = {
    'IA', "l'IA", "d'IA", "de l'IA", "sur l'IA", "à l'IA", 'IA de confiance',
    'agents IA', 'agent IA', 'IA générative', 'IA conversationnelle',
    'IA responsable', 'IA explicable', 'IA prédictive', 'IA souveraine',
    'IA éthique', 'IA frugale', 'intelligence artificielle',
    'intelligences artificielles', "l'intelligence artificielle",
    'modèle', 'modèles', 'modèle de langage', 'apprentissage automatique',
    "l'apprentissage automatique", 'réseau de neurones',
    'entraîner', 'entraîné', 'entraînement', "l'entraînement",
    'déployer', 'déployé', 'déploiement',
    "grâce à l'IA", "transformation par l'IA", 'feuille de route IA',
    "démocratiser l'IA", "cas d'usage IA", 'transformation IA',
    'révolution IA', 'stratégie IA', "boom de l'IA", 'expert IA', 'stack IA',
    'automatiser', 'optimiser',
}


def category(k):
    french_chars = set('éèêàâîôûçœÉÈÊÀÂÎÔÛÇŒ')
    if any(c in french_chars for c in k) or k in FRENCH_EXPLICIT:
        return 'french'
    if k in PROPER_NOUNS_PEOPLE:
        return 'figures'
    if k in PRODUCTS:
        return 'products'
    if k in ACRONYMS_CORE:
        return 'core-acronyms'
    return 'concepts'


HEADER = """# Holiday from AI — detection list

Auto-generated from `extension/themes/analog-life.json`. **Do not edit by hand** — edits here won't reach the shipped extension. Modify the JSON, then re-run `python3 build_dictionary_md.py` to regenerate this file.

The list is a tripwire: any LinkedIn post containing one of these terms is replaced with a garden haiku.

- **Total entries:** {total}

---

"""

SECTION_ORDER = [
    ('core-acronyms', 'Core AI acronyms',
     'Short all-caps tokens. These compile with case-sensitive regex so they do not collide with French words like `j\'ai` or `agi` (past tense of *agir*).'),
    ('concepts', 'Concepts, verbs, buzzwords, compound phrases', None),
    ('products', 'Product & company names', None),
    ('figures', 'AI industry figures', 'Famous individuals in the AI world, replaced with garden-figure equivalents.'),
    ('french', 'French entries',
     'Unequivocally French keys → French garden replacements. Strict A applies — no leading articles, including hidden ones in contractions (`au` = à+le, `du` = de+le).'),
]


def render_table(items):
    # sort alphabetically, case-insensitive
    items = sorted(items, key=lambda k: k.lower())
    out = ['| Term |', '|---|']
    for k in items:
        out.append(f'| `{k}` |')
    return '\n'.join(out)


def main():
    d = json.load(open(JSON_PATH))
    total = len(d)

    cats = {}
    for k in d:
        cats.setdefault(category(k), []).append(k)

    out = [HEADER.format(total=total)]
    for cat_key, title, subtitle in SECTION_ORDER:
        items = cats.get(cat_key, [])
        out.append(f'## {title}\n')
        if subtitle:
            out.append(f'{subtitle}\n')
        out.append(f'{len(items)} entries.\n')
        out.append(render_table(items))
        out.append('\n')

    with open(MD_PATH, 'w') as f:
        f.write('\n'.join(out))
        f.write('\n')
    print(f'wrote {MD_PATH} ({total} entries across {len(cats)} categories)')


if __name__ == '__main__':
    main()
