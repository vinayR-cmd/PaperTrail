import logging
import pandas as pd

logging.getLogger("prophet").setLevel(logging.ERROR)
logging.getLogger("cmdstanpy").setLevel(logging.ERROR)
logging.getLogger("pystan").setLevel(logging.ERROR)

def get_cluster_publication_trend(papers: list[dict]) -> pd.DataFrame:
    year_counts = {}
    for p in papers:
        yr = p.get("year")
        if yr:
            year_counts[yr] = year_counts.get(yr, 0) + 1

    data = []
    for yr, count in sorted(year_counts.items()):
        if count == 0:
            continue
        monthly_y = count / 12.0
        for month in range(1, 13):
            date_str = f"{yr}-{month:02d}-01"
            data.append({"ds": pd.to_datetime(date_str), "y": monthly_y})

    if not data:
        return pd.DataFrame(columns=["ds", "y"])
    return pd.DataFrame(data)

def forecast_cluster_growth(
    papers: list[dict],
    forecast_months: int = 12,
    topic_slug: str = None,
    cluster_id=None,
    admin_client=None
) -> dict:
    # ── CHECK CACHE ───────────────────────────────────────
    if topic_slug and cluster_id is not None and admin_client:
        try:
            cache = admin_client.table("prophet_cache")\
                .select("*")\
                .eq("topic_slug", topic_slug)\
                .eq("cluster_id", int(cluster_id))\
                .execute()

            if cache.data:
                print(f"Prophet cache HIT: {topic_slug}/{cluster_id}")
                row = cache.data[0]
                return {
                    "growth_rate": float(row.get("growth_rate", 0)),
                    "urgency": row.get("urgency", "STABLE"),
                    "urgency_label": row.get("urgency_label", ""),
                    "current_monthly_avg": float(
                        row.get("current_monthly_avg", 0)),
                    "forecast_monthly_12m": float(
                        row.get("forecast_monthly_12m", 0)),
                    "data_points": row.get("data_points", 0)
                }
        except Exception as e:
            print(f"Prophet cache read error: {e}")
    # ── END CACHE CHECK ───────────────────────────────────

    df = get_cluster_publication_trend(papers)

    if df is None or len(df) < 5:
        result = {
            "growth_rate": 0.0,
            "urgency": "INSUFFICIENT_DATA",
            "urgency_label": "Not enough data to forecast",
            "current_monthly_avg": 0.0,
            "forecast_monthly_12m": 0.0,
            "data_points": len(df) if df is not None else 0
        }
    else:
        try:
            from prophet import Prophet

            model = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=False,
                daily_seasonality=False,
                changepoint_prior_scale=0.1
            )
            model.fit(df)

            future = model.make_future_dataframe(
                periods=forecast_months, freq="MS"
            )
            forecast = model.predict(future)

            last_actual_y = df["y"].iloc[-1]
            forecast_12m_out = forecast["yhat"].iloc[-1]

            if last_actual_y == 0:
                growth_rate = 0.0
            else:
                growth_rate = round(
                    (forecast_12m_out - last_actual_y) / last_actual_y * 100, 1
                )

            if growth_rate > 30:
                urgency = "URGENT"
                urgency_label = (
                    f"Growing at {growth_rate}%/year. "
                    "Publish within 6 months before gap fills."
                )
            elif growth_rate > 10:
                urgency = "ACTIVE"
                urgency_label = (
                    f"Growing at {growth_rate}%/year. "
                    "Good opportunity, act within 1 year."
                )
            elif growth_rate >= 0:
                urgency = "STABLE"
                urgency_label = (
                    f"Stable growth at {growth_rate}%/year. "
                    "Gap likely persists 1-2 years."
                )
            else:
                urgency = "DECLINING"
                urgency_label = (
                    f"Declining at {abs(growth_rate)}%/year. "
                    "Gap may persist long-term but low activity."
                )

            result = {
                "growth_rate": growth_rate,
                "urgency": urgency,
                "urgency_label": urgency_label,
                "current_monthly_avg": round(float(df["y"].mean()), 4),
                "forecast_monthly_12m": round(float(forecast_12m_out), 4),
                "data_points": len(df)
            }

        except Exception as e:
            print(f"Prophet error: {e}")
            result = {
                "growth_rate": 0.0,
                "urgency": "STABLE",
                "urgency_label": "Forecast unavailable",
                "current_monthly_avg": round(float(df["y"].mean()), 4) if len(df) > 0 else 0.0,
                "forecast_monthly_12m": 0.0,
                "data_points": len(df)
            }

    # ── SAVE TO CACHE ─────────────────────────────────────
    if topic_slug and cluster_id is not None and admin_client:
        try:
            admin_client.table("prophet_cache").upsert({
                "topic_slug": topic_slug,
                "cluster_id": int(cluster_id),
                "growth_rate": result["growth_rate"],
                "urgency": result["urgency"],
                "urgency_label": result["urgency_label"],
                "current_monthly_avg": result["current_monthly_avg"],
                "forecast_monthly_12m": result["forecast_monthly_12m"],
                "data_points": result["data_points"]
            }, on_conflict="topic_slug,cluster_id").execute()
        except Exception as e:
            print(f"Prophet cache save error (non-critical): {e}")
    # ── END CACHE SAVE ────────────────────────────────────

    return result

def add_forecasts_to_gaps(
    gaps: list[dict],
    topic_slug: str = None,
    admin_client=None
) -> list[dict]:
    urgency_order = {
        "URGENT": 0, "ACTIVE": 1,
        "STABLE": 2, "DECLINING": 3,
        "INSUFFICIENT_DATA": 4
    }

    for gap in gaps:
        cluster_a_id = gap.get("cluster_a_id", 0)
        cluster_b_id = gap.get("cluster_b_id", 0)

        forecast_a = forecast_cluster_growth(
            gap.get("top_papers_a", []),
            topic_slug=topic_slug,
            cluster_id=cluster_a_id,
            admin_client=admin_client
        )
        forecast_b = forecast_cluster_growth(
            gap.get("top_papers_b", []),
            topic_slug=topic_slug,
            cluster_id=cluster_b_id,
            admin_client=admin_client
        )

        if (urgency_order.get(forecast_a["urgency"], 4) <=
                urgency_order.get(forecast_b["urgency"], 4)):
            combined = forecast_a
        else:
            combined = forecast_b

        gap["forecast_cluster_a"] = forecast_a
        gap["forecast_cluster_b"] = forecast_b
        gap["combined_urgency"] = combined["urgency"]
        gap["combined_urgency_label"] = combined["urgency_label"]

    return gaps
