from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import os

class ClinicalRetriever:
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        self.model = SentenceTransformer(model_name)
        self.index = None
        self.documents = []
        self.doc_metadata = []

    def load_corpus(self, docs: List[Dict[str, str]]):
        """
        Expects docs format: [{'text': '...', 'source': 'ADA 2024'}, ...]
        """
        if not docs:
            return
            
        self.documents = [doc['text'] for doc in docs]
        self.doc_metadata = docs
        
        embeddings = self.model.encode(self.documents, convert_to_numpy=True)
        
        # Initialize FAISS Index
        d = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(d)
        self.index.add(embeddings)

    def retrieve(self, query: str, top_k: int = 3) -> List[Dict[str, str]]:
        if not self.index or len(self.documents) == 0:
            return []
            
        query_emb = self.model.encode([query], convert_to_numpy=True)
        distances, indices = self.index.search(query_emb, top_k)
        
        results = []
        for i in indices[0]:
            if i < len(self.doc_metadata) and i >= 0:
                results.append(self.doc_metadata[i])
                
        return results

# Default Mock Corpus for Prototype
MOCK_CLINICAL_CORPUS = [
    {"text": "Weight loss of 5-15% can improve glycemic control in patients with Type 2 Diabetes and reduce the need for glucose-lowering medications.", "source": "ADA Standards of Care 2024"},
    {"text": "Aerobic exercise should be performed at least 150 minutes per week at moderate-to-vigorous intensity to improve insulin sensitivity.", "source": "WHO Guidelines on Physical Activity"},
    {"text": "Higher HbA1c levels (>7.0%) are associated with increased risk of microvascular complications such as retinopathy and nephropathy.", "source": "CDC Diabetes Resources"},
    {"text": "Reducing BMI to < 25 is recommended for most patients with Type 2 Diabetes to manage insulin resistance.", "source": "NICE Diabetes Guidance"},
    {"text": "A reduction in HbA1c by 1% is associated with a 37% decrease in the risk of microvascular complications.", "source": "UKPDS Study"}
]
