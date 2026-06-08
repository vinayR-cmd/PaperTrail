import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.embedder import (
    embed_papers_for_topic,
    query_similar_papers,
    get_collection_stats
)
from app.core.database import get_admin_client

def main():
    print("=== Testing ChromaDB + Embedding Pipeline ===")
    
    admin_client = get_admin_client()
    
    # Step 2: Call embed_papers_for_topic
    result = embed_papers_for_topic("machine-learning", admin_client)
    print("Result:", result)
    
    # Step 3: Print collection stats
    stats = get_collection_stats()
    print(f"\nTotal vectors in ChromaDB: {stats['total_vectors']}\n")
    
    # Step 4: Test semantic search query 1
    print("Top 5 similar papers:")
    results1 = query_similar_papers(
        query_text="deep learning neural networks image classification",
        topic_slug="machine-learning",
        n_results=5
    )
    for i, res in enumerate(results1, 1):
        print(f"{i}. \"{res['title']}\" ({res['year']}) - score: {res['distance']:.4f}")
        
    # Step 5: Test semantic search query 2
    print("\nTop 5 papers for NLP query:")
    results2 = query_similar_papers(
        query_text="natural language processing text generation",
        topic_slug="machine-learning",
        n_results=5
    )
    for i, res in enumerate(results2, 1):
        print(f"{i}. \"{res['title']}\" ({res['year']}) - score: {res['distance']:.4f}")
        
    # Step 6: Final summary
    print("\n=== Day 3 Complete ===")
    print(f"Vectors in ChromaDB: {stats['total_vectors']}")
    print("chroma_db/ folder created at: ./chroma_db")
    print("Model used: all-MiniLM-L6-v2 (384 dimensions)")

if __name__ == "__main__":
    main()
