
import re
import html
import httpx
from typing import List, Optional
from fastapi import HTTPException

from config import YOUTUBE_API_KEY
from schemas import VideosResponse, VideoResult
from services.ai_utils import call_ai_with_fallback
from services.prompts import get_video_topic_prompt

async def search_youtube_videos(topic: str, page_token: Optional[str] = None) -> VideosResponse:
    """Search for educational YouTube videos."""
    if not YOUTUBE_API_KEY:
        raise HTTPException(status_code=503, detail="YouTube API not configured")
    
    search_topic = topic
    
    # Extract main topic using AI if content is long
    if len(topic) > 100:
        try:
            topic_prompt = get_video_topic_prompt(topic)
            extracted = await call_ai_with_fallback(topic_prompt)
            if extracted and 3 < len(extracted) < 100:
                search_topic = extracted.strip()
        except Exception:
            search_topic = topic[:50]
    
    # Clean search topic
    search_topic = re.sub(r'[^\w\s]', ' ', search_topic)
    search_topic = re.sub(r'\s+', ' ', search_topic).strip()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Search YouTube
        search_params = {
            "part": "snippet",
            "q": f"{search_topic} explained tutorial",
            "type": "video",
            "maxResults": "15",
            "videoDuration": "medium",
            "relevanceLanguage": "en",
            "safeSearch": "strict",
            "videoEmbeddable": "true",
            "key": YOUTUBE_API_KEY
        }
        if page_token:
            search_params["pageToken"] = page_token
        
        search_response = await client.get(
            "https://www.googleapis.com/youtube/v3/search",
            params=search_params
        )
        
        if search_response.status_code != 200:
            raise HTTPException(status_code=503, detail="YouTube API error")
        
        search_data = search_response.json()
        items = search_data.get("items", [])
        video_ids = [item["id"]["videoId"] for item in items if item.get("id", {}).get("videoId")]
        
        # Get video details (duration)
        durations = {}
        if video_ids:
            details_response = await client.get(
                "https://www.googleapis.com/youtube/v3/videos",
                params={
                    "part": "contentDetails",
                    "id": ",".join(video_ids),
                    "key": YOUTUBE_API_KEY
                }
            )
            if details_response.status_code == 200:
                details_data = details_response.json()
                for item in details_data.get("items", []):
                    vid = item.get("id")
                    dur = item.get("contentDetails", {}).get("duration")
                    if vid and dur:
                        durations[vid] = parse_iso8601_duration(dur)
        
        # Build results
        topic_words = [w.lower() for w in search_topic.split() if len(w) > 2]
        videos = []
        
        for item in items:
            video_id = item.get("id", {}).get("videoId")
            if not video_id:
                continue
            
            snippet = item.get("snippet", {})
            title = decode_html_entities(snippet.get("title", ""))
            channel = snippet.get("channelTitle", "")
            
            # Calculate relevance
            relevance = calculate_relevance(title, channel, topic_words)
            
            # Filter clickbait
            if is_clickbait(title):
                continue
            
            if relevance < 0.35:
                continue
            
            videos.append(VideoResult(
                id=video_id,
                title=title,
                thumbnail=snippet.get("thumbnails", {}).get("high", {}).get("url") or 
                         snippet.get("thumbnails", {}).get("default", {}).get("url", ""),
                channel=channel,
                relevance_score=round(relevance, 2),
                duration=durations.get(video_id)
            ))
        
        # Sort by relevance and limit
        videos.sort(key=lambda v: v.relevance_score or 0, reverse=True)
        videos = videos[:10]
        
        return VideosResponse(
            result=videos,
            next_page_token=search_data.get("nextPageToken")
        )

def calculate_relevance(title: str, channel: str, topic_words: List[str]) -> float:
    """Calculate relevance score based on topic match."""
    title_lower = title.lower()
    channel_lower = (channel or "").lower()
    matches = 0
    
    # Check topic word matches
    for word in topic_words:
        if word in title_lower:
            matches += 1
    
    # Boost for educational keywords
    edu_keywords = ['tutorial', 'explained', 'learn', 'course', 'lesson', 'guide', 
                   'how to', 'introduction', 'basics', 'beginner', 'complete', 
                   'crash course', 'fundamentals']
    for kw in edu_keywords:
        if kw in title_lower:
            matches += 0.5
    
    # Boost for educational channels
    edu_channel_keywords = ['academy', 'school', 'university', 'edu', 'learn', 
                           'course', 'tutor', 'class', 'professor', 'khan', 'codecademy']
    for kw in edu_channel_keywords:
        if kw in channel_lower:
            matches += 0.3
            break
    
    # Penalty for entertainment
    entertainment_keywords = ['funny', 'crazy', 'insane', 'epic', 'amazing', 'incredible']
    for kw in entertainment_keywords:
        if kw in title_lower:
            matches -= 0.2
    
    return max(0, matches / len(topic_words)) if topic_words else 0.5

def is_clickbait(title: str) -> bool:
    """Check if title suggests clickbait/entertainment content."""
    title_lower = title.lower()
    negative_patterns = [
        'challenge', 'prank', 'vlog', 'reaction', 'mukbang', 'asmr',
        'gameplay', 'gaming', 'live stream', 'giveaway', 'unboxing',
        "you won't believe", 'shocking', 'gone wrong', 'try not to',
        'tiktok', 'shorts compilation', 'memes', 'roast', 'drama',
        'exposed', 'cancelled', 'dating', 'relationship', 'gossip'
    ]
    return any(pattern in title_lower for pattern in negative_patterns)

def parse_iso8601_duration(duration: str) -> str:
    """Parse YouTube ISO 8601 duration (PT12M30S) to MM:SS format."""
    if not duration:
        return "0:00"
    
    match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration)
    if not match:
        return "0:00"
    
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    
    total_minutes = hours * 60 + minutes
    
    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    else:
        return f"{total_minutes}:{seconds:02d}"

def decode_html_entities(text: str) -> str:
    """Decode HTML entities in text."""
    return html.unescape(text) if text else ""
