import requests

topics = [
    "Large Language Models",
    "Natural Language Processing", 
    "Transformer",
    "GPT",
    "Language Model"
]

headers = {"User-Agent": "PaperTrail/1.0 (vinay.workspace@gmail.com)"}

for topic in topics:
    res = requests.get(
        "https://api.openalex.org/concepts",
        params={"search": topic, "per_page": 2},
        headers=headers,
        timeout=15
    )
    data = res.json()
    results = data.get("results", [])
    if results:
        for r in results:
            print(f"'{topic}' → '{r['display_name']}' ({r['id'].split('/')[-1]})")
    else:
        print(f"'{topic}' → NO RESULTS FOUND")
    print() 