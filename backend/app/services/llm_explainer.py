import json
from groq import Groq
from app.core.config import settings

def format_papers(papers):
    lines = []
    for i, p in enumerate(papers, 1):
        lines.append(f"{i}. \"{p.get('title', 'Unknown')}\" ({p.get('year', 'N/A')}) - Citations: {p.get('citation_count', 0)}")
    return "\n".join(lines)

def format_contradictions(contradictions):
    if not contradictions:
        return "None detected."
    lines = []
    for i, c in enumerate(contradictions[:2], 1):
        lines.append(f"  - Contradiction {i}: \"{c.get('paper_a_title')}\" vs \"{c.get('paper_b_title')}\" (Contradiction Score: {c.get('contradiction_score')})")
    return "\n".join(lines)

def build_gap_prompt(gap: dict) -> str:
    papers_a_str = format_papers(gap.get('top_papers_a', []))
    papers_b_str = format_papers(gap.get('top_papers_b', []))
    contradictions_str = format_contradictions(gap.get('contradictions', []))
    
    forecast_a = gap.get('forecast_cluster_a', {}).get('urgency_label', 'N/A')
    forecast_b = gap.get('forecast_cluster_b', {}).get('urgency_label', 'N/A')
    combined_urgency = gap.get('combined_urgency', 'N/A')
    
    # Extract top papers for Community A and B
    top_papers_a = gap.get('top_papers_a', [])
    top_papers_b = gap.get('top_papers_b', [])
    
    top_paper_a_title = top_papers_a[0]['title'] if top_papers_a else 'N/A'
    top_paper_a_year = top_papers_a[0]['year'] if top_papers_a else 'N/A'
    
    top_paper_b_title = top_papers_b[0]['title'] if top_papers_b else 'N/A'
    top_paper_b_year = top_papers_b[0]['year'] if top_papers_b else 'N/A'

    prompt = f"""You are a research intelligence assistant. Analyze this research gap and generate a structured report.

GAP OVERVIEW:
- Gap Label: {gap.get('gap_label', 'N/A')}
- Gap Score: {gap.get('gap_score', 0.0)}/100 (higher = more significant gap, max 100)
- Research Community A: {gap.get('cluster_a_size', 0)} papers
  Top paper: "{top_paper_a_title}"
  Published: {top_paper_a_year}
- Research Community B: {gap.get('cluster_b_size', 0)} papers
  Top paper: "{top_paper_b_title}"
  Published: {top_paper_b_year}
- Papers bridging both communities: {gap.get('bridge_paper_count', 0)} (fewer bridge papers = larger gap = higher opportunity)

TOP PAPERS IN CLUSTER A (first research community):
{papers_a_str}

TOP PAPERS IN CLUSTER B (second research community):
{papers_b_str}

CONTRADICTIONS DETECTED: {gap.get('contradiction_count', 0)}
{contradictions_str}

TREND FORECAST:
- Cluster A: {forecast_a}
- Cluster B: {forecast_b}
- Combined urgency: {combined_urgency}

TASK:
Based on this data, generate a research intelligence report.
Return ONLY a valid JSON object with NO markdown formatting, NO code blocks, NO extra text before or after the JSON.

IMPORTANT INSTRUCTIONS:
- Write gap_explanation as if explaining to a PhD student who knows the field but hasn't seen this specific gap
- Be specific — name the actual research areas based on the paper titles provided above
- suggested_research_question must be one complete, specific, publishable question (not truncated)
- suggested_methodology must name specific techniques relevant to both communities shown above
- All fields must be complete sentences, not fragments
- gap_explanation minimum 3 sentences
- suggested_research_question must end with a question mark

Return exactly this JSON structure:
{{
  "gap_explanation": "A detailed plain English explanation of what this research gap is and why it exists. Mention specific areas based on paper titles.",
  "why_it_matters": "1-2 sentences on real-world impact. Why would filling this gap matter?",
  "suggested_research_question": "One specific, publishable research question that would directly address this gap.",
  "suggested_methodology": "2-3 sentences suggesting a concrete research methodology to address this gap, referencing specific techniques.",
  "urgency_explanation": "1-2 sentences explaining the timing referencing growth rates and contradiction data."
}}"""
    return prompt

def call_groq_llm(prompt: str) -> dict:
    try:
        client = Groq(api_key=settings.GROQ_API_KEY)
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system", 
                    "content": (
                        "You are a research intelligence assistant. "
                        "You always respond with valid JSON only. "
                        "No markdown. No explanation. Just the JSON object."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1000
        )
        
        raw_text = response.choices[0].message.content
        
        # Clean response
        raw_text = raw_text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()
        
        try:
            result = json.loads(raw_text)
        except json.JSONDecodeError:
            return {
                "gap_explanation": raw_text[:500],
                "why_it_matters": "Parse error - raw response above",
                "suggested_research_question": "",
                "suggested_methodology": "",
                "urgency_explanation": ""
            }
            
        required = ["gap_explanation", "why_it_matters",
                    "suggested_research_question",
                    "suggested_methodology", "urgency_explanation"]
        for key in required:
            if key not in result:
                result[key] = "Analysis unavailable for this field."
                
        return result
    except Exception as e:
        raise RuntimeError(f"Groq API call failed: {str(e)}")

def explain_gap(gap: dict) -> dict:
    prompt = build_gap_prompt(gap)
    result = call_groq_llm(prompt)
    
    gap["llm_explanation"] = result["gap_explanation"]
    gap["llm_why_it_matters"] = result["why_it_matters"]
    gap["llm_research_question"] = result["suggested_research_question"]
    gap["llm_methodology"] = result["suggested_methodology"]
    gap["llm_urgency_explanation"] = result["urgency_explanation"]
    gap["llm_generated"] = True
    
    print(f"LLM explanation generated for: {gap.get('gap_label')}")
    return gap

def build_brief_prompt(gap: dict) -> str:
    papers_a = gap.get('top_papers_a', [])
    papers_b = gap.get('top_papers_b', [])
    all_papers = papers_a + papers_b

    papers_str = format_papers(all_papers[:6])

    return f"""You are a research writing assistant helping an academic write a new paper.

GAP TO FILL:
- Title: {gap.get('gap_label', 'N/A')}
- Gap Score: {gap.get('gap_score', 0)}/100
- Community A ({gap.get('cluster_a_size', 0)} papers) meets Community B ({gap.get('cluster_b_size', 0)} papers)
- Bridge papers: {gap.get('bridge_paper_count', 0)} (very few means large gap)
- Contradictions detected: {gap.get('contradiction_count', 0)}

EXISTING RESEARCH CONTEXT:
{papers_str}

TASK:
Generate a complete research starter kit for this gap.
Return ONLY a valid JSON object — no markdown, no code blocks, no extra text.

Return exactly this structure:
{{
  "refined_question": "One specific, publishable research question ending with a question mark.",
  "abstract_draft": "A 150-word abstract draft for a paper addressing this gap. Include background, gap, approach, and expected contribution.",
  "methodology": "2-3 paragraphs describing a concrete methodology. Name specific techniques, datasets, and evaluation metrics relevant to the research communities shown.",
  "top_papers": [
    {{"title": "Paper title", "year": 2023, "doi": "10.xxxx/xxxxx or null", "reason": "Why this paper is essential to cite"}},
    {{"title": "Paper title", "year": 2022, "doi": null, "reason": "Why this paper is essential to cite"}},
    {{"title": "Paper title", "year": 2021, "doi": null, "reason": "Why this paper is essential to cite"}}
  ],
  "target_journal": "Full journal name",
  "journal_reason": "1-2 sentences on why this journal is ideal for this paper.",
  "expected_contribution": "2-3 sentences on what this paper would contribute to both research communities and the field.",
  "timeline": "A realistic 6-12 month breakdown: data collection, experiments, writing, submission."
}}"""


def generate_research_brief(gap: dict) -> dict:
    prompt = build_brief_prompt(gap)
    try:
        client = Groq(api_key=settings.GROQ_API_KEY)
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a research writing assistant. "
                        "You always respond with valid JSON only. "
                        "No markdown. No explanation. Just the JSON object."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
            max_tokens=1800
        )

        raw_text = response.choices[0].message.content.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        result = json.loads(raw_text)

        required = ["refined_question", "abstract_draft", "methodology",
                    "top_papers", "target_journal", "journal_reason",
                    "expected_contribution", "timeline"]
        for key in required:
            if key not in result:
                result[key] = "Content unavailable for this field."

        if not isinstance(result.get("top_papers"), list):
            result["top_papers"] = []

        return result

    except json.JSONDecodeError:
        return {
            "refined_question": "Unable to generate research question.",
            "abstract_draft": "Brief generation failed — please try again.",
            "methodology": "",
            "top_papers": [],
            "target_journal": "",
            "journal_reason": "",
            "expected_contribution": "",
            "timeline": ""
        }
    except Exception as e:
        raise RuntimeError(f"Brief generation failed: {str(e)}")


def explain_all_gaps(gaps: list[dict]) -> list[dict]:
    total = len(gaps)
    for idx, gap in enumerate(gaps, 1):
        explain_gap(gap)
        print(f"Explained gap {idx}/{total}")
    return gaps
