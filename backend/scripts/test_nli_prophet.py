import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.graph_analyzer import find_gaps
from app.core.database import get_admin_client

def main():
    print("=== Day 5+6: NLI Contradiction + Prophet Forecast ===")
    
    admin_client = get_admin_client()
    
    # Step 2: Run find_gaps
    print("Finding gaps with NLI and forecast enrichment...")
    print("NOTE: NLI model downloads ~350MB on first run.")
    print("This will take 3-5 minutes total. Please wait...")
    
    try:
        gaps = find_gaps("machine-learning", admin_client)
        
        # Step 3: Print enriched gap results
        print(f"\nTotal gaps found: {len(gaps)}")
        for i, gap in enumerate(gaps[:2]):
            print(f"\n--- Gap {i+1} ---")
            print(f"Label: {gap['gap_label']}")
            print(f"Gap Score: {gap['gap_score']}")
            
            print(f"\nForecast:")
            print(f"  Cluster A: {gap['forecast_cluster_a']['urgency_label']}")
            print(f"  Cluster B: {gap['forecast_cluster_b']['urgency_label']}")
            print(f"  Combined urgency: {gap['combined_urgency']}")
            
            print(f"\nContradictions found: {gap['contradiction_count']}")
            if gap['contradictions']:
                c = gap['contradictions'][0]
                print(f"  Top contradiction (score: {c['contradiction_score']}):")
                print(f"  Paper A: {c['paper_a_title']}")
                print(f"  Paper B: {c['paper_b_title']}")
                
        # Step 4: Print final completion message
        print("\n=== NLI + Prophet Pipeline Complete ===")
        print("Your gap output now includes:")
        print("  [x] Gap score (NetworkX + Louvain)")
        print("  [x] Contradiction pairs (DeBERTa NLI)")
        print("  [x] Growth forecast (Prophet)")
        print("  [x] Urgency label")
        print("This is the complete research intelligence report.")

        
    except Exception as e:
        print(f"\nTest failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
