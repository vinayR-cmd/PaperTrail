import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.citation_fetcher import build_citation_edges_for_topic
from app.services.graph_analyzer import (
    build_networkx_graph,
    detect_communities,
    find_gaps
)
from app.core.database import get_admin_client

def main():
    print("=== Day 4: Citation Graph + Gap Detection ===")
    
    admin_client = get_admin_client()
    
    # Step 2: Build citation edges
    print("\nBuilding citation edges for 'machine-learning'...")
    result = build_citation_edges_for_topic("machine-learning", admin_client)
    print("Result:", result)
    
    # Step 3: Build graph and detect communities
    print("\nBuilding NetworkX graph and running Louvain clustering...")
    G = build_networkx_graph("machine-learning", admin_client)
    communities = detect_communities(G)
    print(f"Communities found: {communities['num_communities']}")
    print(f"Community sizes: {communities['community_sizes']}")
    
    # Step 4: Find gaps
    print("\nFinding research gaps...")
    gaps = find_gaps("machine-learning", admin_client)
    print(f"\nTop gaps found: {len(gaps)}")
    for i, gap in enumerate(gaps[:3]):
        print(f"\nGap {i+1}:")
        print(f"  Label: {gap['gap_label']}")
        print(f"  Score: {gap['gap_score']}")
        print(f"  Cluster A size: {gap['cluster_a_size']} papers")
        print(f"  Cluster B size: {gap['cluster_b_size']} papers")
        print(f"  Bridge papers: {gap['bridge_paper_count']}")
        
    # Step 5: Print final summary
    print("\n=== Gap Detection Working ===")
    print("Run the FastAPI server and test:")
    print("POST http://localhost:8000/search/gaps")
    print("body: {'topic_slug': 'machine-learning'}")

if __name__ == "__main__":
    main()
