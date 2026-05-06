"""
Task definitions for the 3 AI agents.
Prompts are optimized for speed — concise, focused, no fluff.
"""

from crewai import Task, Agent


def create_planning_task(agent: Agent, user_request: str) -> Task:
    """Travel Manager: parse NL into structured parameters."""
    return Task(
        description=(
            f"Extract structured travel params from: {user_request}\n\n"
            f"Output EXACTLY this format (fill defaults if missing):\n"
            f"- Destinations: [city list]\n"
            f"- Origin: [city]\n"
            f"- Duration: [N days]\n"
            f"- Dates: [departure-date] to [return-date or empty]\n"
            f"- Travelers: [number]\n"
            f"- Budget: [luxury/mid-range/budget]\n"
            f"- Interests: [comma-separated list]\n"
            f"- Cabin Class: [economy/business/first]\n"
            f"- Special Requirements: [none or specific]\n\n"
            f"Use the knowledge tool if helpful. Output structured format only."
        ),
        expected_output=(
            "Structured breakdown: Destinations, Origin, Duration, "
            "Dates, Travelers, Budget, Interests, Cabin Class, Special Requirements"
        ),
        agent=agent,
    )


def create_knowledge_task(agent: Agent, destination: str) -> Task:
    """Knowledge Expert: provide travel knowledge for destination."""
    return Task(
        description=(
            f"Provide travel knowledge for: {destination}\n"
            f"Cover: visa/entry, cultural etiquette, best time to visit, "
            f"currency/payment, safety tips, packing tips, local customs, "
            f"dining etiquette, insider tips.\n"
            f"Use the knowledge tool. Be concise but complete."
        ),
        expected_output=(
            "Concise travel guide: visa, culture, weather, currency, "
            "safety, packing, customs, dining, tips."
        ),
        agent=agent,
    )


def create_compilation_task(
    agent: Agent,
    user_request: str,
    planning_output: str,
    flights_data: str,
    accommodation_data: str,
    activities_data: str,
    logistics_data: str,
    knowledge_output: str,
) -> Task:
    """Itinerary Compiler: synthesize all data into day-by-day plan."""
    return Task(
        description=(
            f"Create a day-by-day itinerary from the REAL DATA below.\n"
            f"ONLY use data provided — do not hallucinate.\n\n"
            f"## Request\n{user_request}\n\n"
            f"## Plan\n{planning_output}\n\n"
            f"## Flights\n{flights_data}\n\n"
            f"## Hotels\n{accommodation_data}\n\n"
            f"## Activities & Dining\n{activities_data}\n\n"
            f"## Transport & Weather\n{logistics_data}\n\n"
            f"## Knowledge\n{knowledge_output}\n\n"
            f"RULES:\n"
            f"1. Day-by-day format with practical timing\n"
            f"2. Group by neighborhood — minimize transit\n"
            f"3. Recommend best flight + hotel with reasoning\n"
            f"4. Include restaurant/activity picks from real data\n"
            f"5. Weather-appropriate suggestions\n"
            f"6. Total budget estimate at end\n"
            f"7. Include booking URLs where available\n"
            f"8. Write in Chinese\n"
        ),
        expected_output=(
            "Complete itinerary with: Trip Overview, Flight Recommendation, "
            "Hotel Recommendation, Day-by-Day Plan, Weather Note, "
            "Practical Tips, Budget Summary, Booking Links."
        ),
        agent=agent,
    )
