DO $$
DECLARE
  missing_sources INTEGER;
  missing_chunks INTEGER;
  missing_embeddings INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO missing_sources
  FROM yijing_sources ys
  WHERE NOT EXISTS (
    SELECT 1
    FROM knowledge_sources ks
    WHERE ks.id = ys.id
      AND ks.domain = 'yijing'
  );

  SELECT COUNT(*)
  INTO missing_chunks
  FROM yijing_chunks yc
  WHERE NOT EXISTS (
    SELECT 1
    FROM knowledge_chunks kc
    WHERE kc.id = yc.id
      AND kc.source_id = yc.source_id
      AND kc.domain = 'yijing'
      AND kc.chunk_index = yc.chunk_index
  );

  SELECT COUNT(*)
  INTO missing_embeddings
  FROM yijing_chunk_embeddings yce
  WHERE NOT EXISTS (
    SELECT 1
    FROM knowledge_chunk_embeddings kce
    WHERE kce.chunk_id = yce.chunk_id
      AND kce.source_id = yce.source_id
      AND kce.domain = 'yijing'
  );

  IF missing_sources > 0 OR missing_chunks > 0 OR missing_embeddings > 0 THEN
    RAISE EXCEPTION
      'Cannot drop yijing legacy knowledge tables: % sources, % chunks, % embeddings are missing from unified tables',
      missing_sources, missing_chunks, missing_embeddings;
  END IF;

  SELECT COUNT(*)
  INTO missing_sources
  FROM ziwei_sources zs
  WHERE NOT EXISTS (
    SELECT 1
    FROM knowledge_sources ks
    WHERE ks.id = zs.id
      AND ks.domain = 'ziwei'
  );

  SELECT COUNT(*)
  INTO missing_chunks
  FROM ziwei_chunks zc
  WHERE NOT EXISTS (
    SELECT 1
    FROM knowledge_chunks kc
    WHERE kc.id = zc.id
      AND kc.source_id = zc.source_id
      AND kc.domain = 'ziwei'
      AND kc.chunk_index = zc.chunk_index
  );

  SELECT COUNT(*)
  INTO missing_embeddings
  FROM ziwei_chunk_embeddings zce
  WHERE NOT EXISTS (
    SELECT 1
    FROM knowledge_chunk_embeddings kce
    WHERE kce.chunk_id = zce.chunk_id
      AND kce.source_id = zce.source_id
      AND kce.domain = 'ziwei'
  );

  IF missing_sources > 0 OR missing_chunks > 0 OR missing_embeddings > 0 THEN
    RAISE EXCEPTION
      'Cannot drop ziwei legacy knowledge tables: % sources, % chunks, % embeddings are missing from unified tables',
      missing_sources, missing_chunks, missing_embeddings;
  END IF;
END $$;

UPDATE knowledge_sources
SET metadata = metadata - 'legacyTable'
WHERE domain IN ('yijing', 'ziwei')
  AND metadata ? 'legacyTable';

UPDATE knowledge_chunks
SET metadata = metadata - 'legacyTable'
WHERE domain IN ('yijing', 'ziwei')
  AND metadata ? 'legacyTable';

UPDATE knowledge_chunk_embeddings
SET metadata = metadata - 'legacyTable'
WHERE domain IN ('yijing', 'ziwei')
  AND metadata ? 'legacyTable';

DROP TABLE IF EXISTS yijing_chunk_embeddings;
DROP TABLE IF EXISTS yijing_chunks;
DROP TABLE IF EXISTS yijing_sources;

DROP TABLE IF EXISTS ziwei_chunk_embeddings;
DROP TABLE IF EXISTS ziwei_chunks;
DROP TABLE IF EXISTS ziwei_sources;
