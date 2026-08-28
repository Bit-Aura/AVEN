import logging
from typing import List, Dict, Any
from youtubesearchpython import VideosSearch
import asyncio

logger = logging.getLogger(__name__)

async def fetch_dynamic_courses(target_role: str, active_milestone: str = None, limit: int = 6) -> List[Dict[str, Any]]:
    # Construct query based on context
    if active_milestone:
        query = f"{target_role} {active_milestone} tutorial full course"
    else:
        query = f"{target_role} full course tutorial masterclass"
    
    logger.info(f"Fetching YouTube courses for query: {query}")
    try:
        # youtubesearchpython is synchronous by default for VideosSearch, so we run it in a thread
        def search():
            videos_search = VideosSearch(query, limit=limit)
            return videos_search.result()

        results = await asyncio.to_thread(search)
        
        courses = []
        if results and "result" in results:
            for video in results["result"]:
                
                # Extract text description
                desc_snippet = video.get("descriptionSnippet", [])
                description = ""
                if desc_snippet:
                    for part in desc_snippet:
                        description += part.get("text", "")
                
                if not description:
                    description = "Comprehensive guide and course material."
                
                courses.append({
                    "title": video.get("title", "Unknown Course"),
                    "description": description[:120] + "..." if len(description) > 120 else description,
                    "provider": video.get("channel", {}).get("name", "YouTube Creator"),
                    "duration": video.get("duration", "N/A"),
                    "videoId": video.get("id"),
                    "link": video.get("link")
                })
        return courses
    except Exception as e:
        logger.error(f"Failed to fetch YouTube courses: {str(e)}")
        raise e
