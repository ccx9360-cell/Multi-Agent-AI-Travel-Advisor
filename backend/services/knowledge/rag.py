"""
RAG (Retrieval-Augmented Generation) service using ChromaDB.
Provides travel knowledge from local documents.
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class RAGService:
    """Manages the ChromaDB vector store for travel knowledge retrieval."""

    _vectorstore = None
    _initialized = False

    def __init__(self, knowledge_base_path: str = "./data/travel_knowledge"):
        self.knowledge_base_path = knowledge_base_path
        if not RAGService._initialized:
            self._initialize()
            RAGService._initialized = True

    def _initialize(self):
        """Initialize ChromaDB vector store with travel documents."""
        logger.info("Initializing Travel Knowledge RAG system...")

        try:
            from langchain_community.vectorstores import Chroma
            from langchain_openai import OpenAIEmbeddings
            from langchain_text_splitters import RecursiveCharacterTextSplitter
            from langchain_community.document_loaders import DirectoryLoader, TextLoader
        except ImportError as e:
            logger.error(f"RAG dependencies not installed: {e}")
            return

        embeddings = OpenAIEmbeddings()
        persist_directory = "./data/chroma_db"

        if os.path.exists(persist_directory) and os.listdir(persist_directory):
            logger.info("Loading existing vector store...")
            RAGService._vectorstore = Chroma(
                persist_directory=persist_directory,
                embedding_function=embeddings,
            )
        else:
            logger.info("Creating new vector store from documents...")
            os.makedirs(self.knowledge_base_path, exist_ok=True)

            documents = []
            if os.path.exists(self.knowledge_base_path):
                try:
                    loader = DirectoryLoader(
                        self.knowledge_base_path,
                        glob="**/*.txt",
                        loader_cls=TextLoader,
                    )
                    documents = loader.load()
                except Exception as e:
                    logger.warning(f"Error loading documents: {e}")

            if not documents:
                logger.warning("No documents found for RAG knowledge base")
                return

            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
            )
            splits = text_splitter.split_documents(documents)
            logger.info(f"Loaded {len(documents)} documents, split into {len(splits)} chunks")

            RAGService._vectorstore = Chroma.from_documents(
                documents=splits,
                embedding=embeddings,
                persist_directory=persist_directory,
            )
            logger.info("Vector store created and persisted")

    def query(self, query: str, destination: Optional[str] = None, k: int = 3) -> str:
        """Search the knowledge base and return formatted results."""
        if not RAGService._vectorstore:
            return "Knowledge base not available."

        search_query = f"{destination} {query}" if destination else query

        try:
            results = RAGService._vectorstore.similarity_search(search_query, k=k)
            if not results:
                return f"No relevant information found for: {query}"

            response = f"## Travel Knowledge Results\n\n**Query:** {query}\n\n"
            for idx, doc in enumerate(results, 1):
                response += f"### Result {idx}\n{doc.page_content.strip()}\n\n"
                if doc.metadata:
                    response += f"*Source: {doc.metadata}*\n\n---\n\n"

            return response
        except Exception as e:
            logger.error(f"RAG query failed: {e}")
            return f"Error searching knowledge base: {e}"
