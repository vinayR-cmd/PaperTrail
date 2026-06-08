print("""
-- Run this SQL in Supabase SQL Editor:

CREATE OR REPLACE FUNCTION match_papers(
  query_embedding vector(384),
  filter_topic_slug TEXT,
  match_count INT DEFAULT 200
)
RETURNS TABLE (
  openalex_id TEXT,
  topic_slug TEXT,
  similarity FLOAT,
  title TEXT,
  year INT,
  citation_count INT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.openalex_id,
    pe.topic_slug,
    1 - (pe.embedding <=> query_embedding) AS similarity,
    pm.title,
    pm.year,
    pm.citation_count
  FROM paper_embeddings pe
  LEFT JOIN paper_metadata pm
    ON pe.openalex_id = pm.openalex_id
  WHERE pe.topic_slug = filter_topic_slug
  ORDER BY pe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
""")
