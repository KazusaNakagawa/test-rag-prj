# Issues: RAG Accuracy

## Summary
The RAG assistant often returns low-relevance documents and produces generic answers. This appears to be caused by retrieval and ranking behavior rather than the LLM response itself.

## Observed Symptoms
- Queries like "AWS ECR" return unrelated or weakly related documents.
- Queries asking for "recent" or "latest" articles are not satisfied.
- Japanese queries often fail to match keyword search, leading to poor fallback behavior.
- The assistant answers from weak matches instead of asking follow-up questions.

## Likely Root Causes (from code review)
- Vector search always returns the top-N results with no similarity threshold.
- Tools-based re-search is only enabled when there are zero initial matches.
- Keyword extraction only supports alphanumeric tokens, so Japanese queries yield no keywords.
- Retrieval does not consider `last_edited_time`, so "recent" intent is ignored.

## Proposed Improvements
- Add a similarity threshold to filter out weak vector matches.
- Enable tools when the top match similarity is below a threshold, not only when there are zero matches.
- Improve keyword extraction for Japanese (or use the full query for fallback text search).
- Add recency-aware ranking or filtering when queries contain "recent/latest" intent.
- Consider stronger embeddings (e.g., `text-embedding-3-large`) for higher recall.
