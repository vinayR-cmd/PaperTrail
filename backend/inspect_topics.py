from app.core.database import get_admin_client
admin = get_admin_client()

topics = admin.table('topic_registry').select('topic_slug, paper_count').execute()
print('Papers per topic in Supabase:')
total = 0
for t in topics.data:
    print(f'  {t["topic_slug"]}: {t["paper_count"]} papers')
    total += t.get('paper_count', 0) or 0
print(f'Total papers: {total}')
