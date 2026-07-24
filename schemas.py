
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

# =============================================================================
# Standard Features
# =============================================================================

class SummaryRequest(BaseModel):
    context: str
    length: Optional[str] = "medium"  # short, medium, detailed
    style: Optional[str] = "mixed"    # bullet, paragraph, mixed
    focus: Optional[str] = None

class FlashcardsRequest(BaseModel):
    context: str

class QuizzesRequest(BaseModel):
    context: str
    count: Optional[int] = 5
    difficulty: Optional[str] = "medium"  # easy, medium, hard
    force_refresh: Optional[bool] = False

class MindmapRequest(BaseModel):
    context: str

class VideosRequest(BaseModel):
    topic: str
    page_token: Optional[str] = None

class ChatRequest(BaseModel):
    context: str
    query: str

class RoadmapRequest(BaseModel):
    context: str

class NodeExplanationRequest(BaseModel):
    title: str
    description: str

# =============================================================================
# Response Models
# =============================================================================

class Flashcard(BaseModel):
    question: str
    answer: str

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: str

class VideoResult(BaseModel):
    id: str
    title: str
    thumbnail: str
    channel: Optional[str] = None
    relevance_score: Optional[float] = None
    duration: Optional[str] = None

class VideosResponse(BaseModel):
    result: List[VideoResult]
    next_page_token: Optional[str] = None

# =============================================================================
# RAG Models
# =============================================================================

class ProcessDocumentRequest(BaseModel):
    file_id: str       # Document ID in Supabase
    file_url: str      # Signed URL to download from Storage

class DocumentStatusResponse(BaseModel):
    status: str        # 'pending', 'processing', 'completed', 'failed'
    progress: float    # 0-100 percentage
    chunks_count: int  # Number of chunks created
    error: Optional[str] = None

class RAGChatRequest(BaseModel):
    document_id: str   # Reference to document for vector search
    query: str

# =============================================================================
# Premium Features of Cherág 
# =============================================================================

class SyllabusAnalysisRequest(BaseModel):
    syllabus_text: str

class DailyPlanRequest(BaseModel):
    goals: List[str]
    available_minutes: int
    learning_dna: dict
    current_progress: dict
    current_hour: int

class RadarAnalysisRequest(BaseModel):
    content: str
    user_mastery: Optional[dict] = {}

class MicroLessonRequest(BaseModel):
    concept: str
    context: str
    previous_questions: List[str] = []

class VideoExtractionRequest(BaseModel):
    video_id: str
    video_title: str

class TeachingChatRequest(BaseModel):
    history: List[dict] # {role: 'teacher'|'student', content: str}
    concept: str
    difficulty: str
    context: Optional[str] = None

class TeachingEvaluationRequest(BaseModel):
    concept: str
    history: List[dict]

class ExamReadinessRequest(BaseModel):
    syllabus: dict
    user_mastery: dict

class ExamQuestionsRequest(BaseModel):
    topics: List[str]
    count: int
    difficulty: str

class StressTestRequest(BaseModel):
    concept: str
    current_level: int
    failed_level: Optional[int] = None

class LearningDNARequest(BaseModel):
    activity_data: dict

class CognitiveLoadRequest(BaseModel):
    metrics: dict

class RemixConceptsRequest(BaseModel):
    concepts: List[dict]

class MentalModelRequest(BaseModel):
    content: str
    model: str

# =============================================================================
# Belief Graph
# =============================================================================

BeliefCorrectness = Literal['correct', 'partially_correct', 'misconception', 'unknown']

class BeliefUpdateRequest(BaseModel):
    student_id: str
    course_id: str
    concept_id: str
    student_answer: str = Field(min_length=1, max_length=8000)

class BeliefNodeResponse(BaseModel):
    id: Optional[str] = None
    student_id: str
    course_id: str
    concept_id: str
    concept_label: str
    belief_statement: Optional[str] = None
    correctness: BeliefCorrectness = 'unknown'
    confidence: float = 0.0
    last_updated: Optional[str] = None
