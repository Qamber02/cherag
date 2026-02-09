
import base64
import asyncio
import httpx
import fitz # PyMuPDF
from typing import List, Optional, Dict, Any
from supabase import create_client, Client
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import (
    GEMINI_KEYS, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, logger
)
from services.pdf_processor import pdf_processor

# Global Supabase Admin Client
supabase_admin: Optional[Client] = None

def init_supabase_admin():
    """Initialize Supabase admin client."""
    global supabase_admin
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            logger.info("Supabase Admin Initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase Admin: {e}")

# Text splitter configuration
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=100,
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""]
)

async def generate_embedding(text: str) -> Optional[List[float]]:
    """Generate embedding using Gemini text-embedding-004."""
    if not GEMINI_KEYS:
        return None
    
    # Use generic HTTP client logic similar to ai_utils?
    # For now, keeping local client here as per original main.py logic, 
    # but ideally we should reuse shared client.
    # To avoid circular dep with ai_utils (if any), I'll use a new client context here.
    # But ai_utils has init_http_client. RAG service can import get_client from ai_utils.
    # Let's import get_client from ai_utils.
    from services.ai_utils import get_client

    client = await get_client()
    # If client is shared (from ai_utils), we don't close it.
    # But get_client returns a shared one or new one.
    # If shared one, we just use it.
    # Wait, ai_utils.get_client returns global `http_client` OR new one.
    # If shared `http_client` is initialized in main::lifespan, it will be returned here.
    
    # HOWEVER, ai_utils logic for "execute request" is encapsulated in _execute_gemini_request.
    # Generating embedding is a different endpoint path.
    # I'll implement logic here using the client.
    
    try:
        # If client is the shared global one, we use it directly.
        # If it's a new one (because global not init), we should close it.
        # Simplified approach: create new client context here for safety if we are unsure about global lifecycle for now,
        # OR trust init_http_client is called.
        # Given main.py refactor plan includes init_http_client, I will assume global client is available mostly.
        # But safest is context manager for now to match original behavior, or use ai_utils pattern if I want to reuse connection.
        # I'll stick to creating new client for RAG tasks to be safe with timeouts (30.0s here vs 60.0s in ai_utils).
        
        async with httpx.AsyncClient(timeout=30.0) as local_client:
             for key in GEMINI_KEYS:
                try:
                    response = await local_client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent",
                        params={"key": key},
                        json={
                            "model": "models/text-embedding-004",
                            "content": {"parts": [{"text": text[:2000]}]}  # Limit text length
                        }
                    )
                    if response.status_code == 200:
                        data = response.json()
                        return data.get("embedding", {}).get("values")
                except Exception:
                    continue
    except Exception:
        pass
    return None

async def ocr_with_gemini(page_image_bytes: bytes) -> str:
    """Use Gemini-2.5-Flash for OCR on image-based pages."""
    if not GEMINI_KEYS:
        return ""
    
    base64_image = base64.b64encode(page_image_bytes).decode('utf-8')
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        for key in GEMINI_KEYS:
            try:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
                    params={"key": key},
                    json={
                        "contents": [{
                            "parts": [
                                {"text": "Extract all text from this image. Return only the extracted text, nothing else."},
                                {"inline_data": {"mime_type": "image/png", "data": base64_image}}
                            ]
                        }]
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            except Exception:
                continue
    return ""

async def embed_and_store_chunks(document_id: str, chunks: List[str], chunk_offset: int) -> int:
    """Generate embeddings and store chunks in Supabase."""
    if not supabase_admin or not chunks:
        return 0
    
    stored_count = 0
    for i, chunk_text in enumerate(chunks):
        if not chunk_text.strip():
            continue
        
        embedding = await generate_embedding(chunk_text)
        if embedding:
            try:
                supabase_admin.table('document_chunks').insert({
                    'document_id': document_id,
                    'content': chunk_text,
                    'embedding': embedding,
                    'chunk_index': chunk_offset + i
                }).execute()
                stored_count += 1
            except Exception as e:
                logger.error(f"[RAG] Failed to store chunk: {e}")
    
    return stored_count

async def update_document_status(document_id: str, status: str, progress: float = 0, error: str = None, content: str = None):
    """Update document processing status in Supabase."""
    if not supabase_admin:
        return
    
    try:
        update_data = {'processing_status': status, 'processing_progress': progress}
        if error:
            update_data['error_message'] = error
        if content is not None:
            update_data['content'] = content
        supabase_admin.table('documents').update(update_data).eq('id', document_id).execute()
    except Exception as e:
        logger.error(f"[RAG] Failed to update status: {e}")

async def process_document_background(document_id: str, file_url: str):
    """Background task: Extract text from PDF using slide-aware processor, chunk, embed, and store."""
    try:
        await update_document_status(document_id, 'processing', 0)
        
        # Download file from Supabase Storage
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.get(file_url)
            if response.status_code != 200:
                raise Exception(f"Failed to download file: {response.status_code}")
            pdf_bytes = response.content
        
        # Process PDF using slide-aware processor
        # WARNING: fitz (PyMuPDF) operations might be blocking.
        # Should wrap in run_in_executor? 
        # pdf_processor.process_pdf_bytes seems to do pure CPU work with fitz.
        # For simplicity and given task constraints ("If blocking: Wrap in run_in_executor"),
        # I should check if pdf_processor is blocking.
        # It calls fitz.open, iterate pages. Yes, it's blocking.
        # I'll execute it in thread pool.
        
        loop = asyncio.get_running_loop()
        # process_pdf_bytes signature: (pdf_bytes) -> List[Dict]
        import functools
        pages = await loop.run_in_executor(
            None, 
            functools.partial(pdf_processor.process_pdf_bytes, pdf_bytes)
        )
        
        total_pages = len(pages)
        
        if total_pages == 0:
            raise Exception("PDF has no pages or could not be read")
        
        pending_chunks = []
        chunk_offset = 0
        total_chunks_stored = 0
        
        for i, page_data in enumerate(pages):
            page_num = page_data['page']
            page_text = page_data['text']
            page_type = page_data['type']
            
            # For visual slides with minimal text, try Gemini OCR
            if page_type == 'visual' and page_data['char_count'] < 20:
                try:
                    # fitz calls inside OCR logic?
                    # The original code did:
                    # doc = fitz.open(...) 
                    # This part is definitely blocking. We should ideally wrap it too.
                    # Creating a helper function for extracting image bytes
                    def extract_image_bytes(p_bytes, p_num):
                        d = fitz.open(stream=p_bytes, filetype="pdf")
                        p = d[p_num - 1]
                        pix = p.get_pixmap(matrix=fitz.Matrix(2, 2))
                        ib = pix.tobytes("png")
                        d.close()
                        return ib
                    
                    image_bytes = await loop.run_in_executor(
                        None, 
                        functools.partial(extract_image_bytes, pdf_bytes, page_num)
                    )
                    
                    ocr_text = await ocr_with_gemini(image_bytes)
                    if ocr_text and len(ocr_text.strip()) > 50:
                        page_text = pdf_processor.clean_text(ocr_text)
                except Exception as ocr_err:
                    logger.warning(f"[RAG] OCR fallback failed for page {page_num}: {ocr_err}")
            
            # Chunk the text
            if page_text.strip():
                chunks = text_splitter.split_text(page_text)
                pending_chunks.extend(chunks)
            
            # Persist every 5 pages
            if (i + 1) % 5 == 0 and pending_chunks:
                stored = await embed_and_store_chunks(document_id, pending_chunks, chunk_offset)
                chunk_offset += len(pending_chunks)
                total_chunks_stored += stored
                pending_chunks = []
                
                # Update progress
                progress = ((i + 1) / total_pages) * 100
                await update_document_status(document_id, 'processing', progress)
        
        # Final batch
        if pending_chunks:
            stored = await embed_and_store_chunks(document_id, pending_chunks, chunk_offset)
            total_chunks_stored += stored
        
        # Mark as completed and save full text
        full_text = "\n\n".join([p['text'] for p in pages if p['text'].strip()])
        await update_document_status(document_id, 'completed', 100, content=full_text)
        
        # Log stats
        stats = pdf_processor.get_stats(pages)
        logger.info(f"[RAG] Document {document_id} processed: {total_chunks_stored} chunks stored")
        logger.info(f"[RAG] Stats: {stats['text_pages']} text, {stats['slide_pages']} slide, {stats['visual_pages']} visual pages")
        
    except Exception as e:
        logger.error(f"[RAG] Processing failed for {document_id}: {e}", exc_info=True)
        await update_document_status(document_id, 'failed', 0, "Internal error during document processing")

async def search_similar_chunks(document_id: str, query: str, limit: int = 5) -> List[str]:
    """Search for similar chunks using vector similarity."""
    if not supabase_admin:
        return []
    
    # Generate embedding for query
    query_embedding = await generate_embedding(query)
    if not query_embedding:
        return []
    
    try:
        # Call the RPC function for similarity search
        result = supabase_admin.rpc('search_similar_chunks', {
            'query_embedding': query_embedding,
            'doc_id': document_id,
            'match_count': limit
        }).execute()
        
        if result.data:
            return [chunk['content'] for chunk in result.data]
    except Exception as e:
        logger.error(f"[RAG] Similarity search failed: {e}")
        # Fallback: get latest chunks without vector search
        try:
            fallback = supabase_admin.table('document_chunks').select('content').eq('document_id', document_id).limit(limit).execute()
            if fallback.data:
                return [chunk['content'] for chunk in fallback.data]
        except Exception:
            pass
    
    return []
