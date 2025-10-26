// RAG System for BC Legal Assistant
// Fetches BC Laws, generates embeddings, and provides RAG-enhanced responses

const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');
const { IndexFlatL2 } = require('faiss-node');

class BCLegalRAG {
    constructor(openaiApiKey) {
        this.openai = new OpenAI({ apiKey: openaiApiKey });
        this.vectorStore = new IndexFlatL2(1536); // OpenAI embedding dimension
        this.documents = [];
        this.embeddings = [];
        this.isInitialized = false;
    }

    // Fetch BC Laws pages from the BC Laws API
    async fetchBCLawsPages(lawUrls = []) {
        console.log('📚 Fetching BC Laws pages...');
        
        // Default BC Laws URLs if none provided (reduced for memory efficiency)
        const defaultUrls = [
            'https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96165_01', // Employment Standards Act
        ];

        const urlsToFetch = lawUrls.length > 0 ? lawUrls : defaultUrls;
        const fetchedDocuments = [];

        for (const url of urlsToFetch) {
            try {
                console.log(`📄 Fetching: ${url}`);
                const response = await axios.get(url, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'BC Legal Assistant Bot 1.0'
                    }
                });

                const $ = cheerio.load(response.data);
                
                // Extract text content from the page (limit size for memory efficiency)
                const title = $('h1').first().text().trim() || 'BC Legal Document';
                let content = $('body').text().replace(/\s+/g, ' ').trim();
                
                // Limit content size to prevent memory issues
                if (content.length > 50000) {
                    content = content.substring(0, 50000) + '... [Content truncated for memory efficiency]';
                }
                
                if (content.length > 100) { // Only include substantial content
                    fetchedDocuments.push({
                        url,
                        title,
                        content,
                        timestamp: new Date().toISOString()
                    });
                    console.log(`✅ Fetched: ${title} (${content.length} chars)`);
                }
            } catch (error) {
                console.error(`❌ Error fetching ${url}:`, error.message);
            }
        }

        return fetchedDocuments;
    }

    // Chunk text into smaller pieces for better retrieval
    chunkText(text, chunkSize = 500, overlap = 100) {
        const chunks = [];
        let start = 0;

        while (start < text.length) {
            const end = Math.min(start + chunkSize, text.length);
            const chunk = text.slice(start, end);
            
            // Try to break at sentence boundaries
            const lastSentence = chunk.lastIndexOf('.');
            const lastParagraph = chunk.lastIndexOf('\n\n');
            const breakPoint = Math.max(lastSentence, lastParagraph);
            
            if (breakPoint > start + chunkSize * 0.5) {
                chunks.push({
                    text: text.slice(start, start + breakPoint + 1).trim(),
                    start,
                    end: start + breakPoint + 1
                });
                start += breakPoint + 1 - overlap;
            } else {
                chunks.push({
                    text: chunk.trim(),
                    start,
                    end
                });
                start = end - overlap;
            }
        }

        return chunks;
    }

    // Generate embeddings for text chunks
    async generateEmbeddings(texts) {
        console.log(`🔮 Generating embeddings for ${texts.length} chunks...`);
        
        try {
            const response = await this.openai.embeddings.create({
                model: 'text-embedding-ada-002',
                input: texts
            });

            return response.data.map(item => item.embedding);
        } catch (error) {
            console.error('❌ Error generating embeddings:', error);
            throw error;
        }
    }

    // Initialize the RAG system with BC Laws data
    async initialize() {
        if (this.isInitialized) {
            console.log('✅ RAG system already initialized');
            return;
        }

        try {
            console.log('🚀 Initializing BC Legal RAG system...');
            
            // Fetch BC Laws documents
            const documents = await this.fetchBCLawsPages();
            
            if (documents.length === 0) {
                console.log('⚠️ No documents fetched, using fallback data');
                await this.loadFallbackData();
                return;
            }

            // Process documents into chunks
            const allChunks = [];
            for (const doc of documents) {
                const chunks = this.chunkText(doc.content);
                for (const chunk of chunks) {
                    allChunks.push({
                        text: chunk.text,
                        source: doc.title,
                        url: doc.url,
                        metadata: {
                            title: doc.title,
                            url: doc.url,
                            timestamp: doc.timestamp
                        }
                    });
                }
            }

            console.log(`📝 Created ${allChunks.length} text chunks`);

            // Generate embeddings
            const chunkTexts = allChunks.map(chunk => chunk.text);
            const embeddings = await this.generateEmbeddings(chunkTexts);

            // Store in vector database
            this.documents = allChunks;
            this.embeddings = embeddings;
            
            // Build FAISS index
            if (embeddings.length > 0) {
                this.vectorStore = new IndexFlatL2(embeddings[0].length);
                this.vectorStore.add(embeddings);
                console.log(`✅ Vector store built with ${embeddings.length} vectors`);
            }

            this.isInitialized = true;
            console.log('🎉 BC Legal RAG system initialized successfully!');

        } catch (error) {
            console.error('❌ Error initializing RAG system:', error);
            await this.loadFallbackData();
        }
    }

    // Load fallback data if BC Laws API is unavailable
    async loadFallbackData() {
        console.log('📚 Loading fallback BC legal data...');
        
        const fallbackData = [
            {
                text: "The Employment Standards Act sets minimum standards for wages, hours of work, and working conditions in British Columbia. Employers must pay at least the minimum wage of $16.75 per hour as of 2024.",
                source: "Employment Standards Act",
                metadata: { title: "Employment Standards Act", section: "Minimum Wage" }
            },
            {
                text: "The BC Human Rights Code prohibits discrimination based on race, colour, ancestry, place of origin, religion, marital status, family status, physical or mental disability, sex, sexual orientation, gender identity or expression, and age.",
                source: "Human Rights Code",
                metadata: { title: "Human Rights Code", section: "Prohibited Grounds" }
            },
            {
                text: "Under the Residential Tenancy Act, landlords must provide 24 hours written notice before entering a rental unit, except in cases of emergency. Tenants have the right to quiet enjoyment of their rental unit.",
                source: "Residential Tenancy Act",
                metadata: { title: "Residential Tenancy Act", section: "Landlord Entry Rights" }
            }
        ];

        this.documents = fallbackData;
        
        // Generate embeddings for fallback data
        const texts = fallbackData.map(doc => doc.text);
        this.embeddings = await this.generateEmbeddings(texts);
        
        // Build FAISS index
        if (this.embeddings.length > 0) {
            this.vectorStore = new IndexFlatL2(this.embeddings[0].length);
            this.vectorStore.add(this.embeddings);
        }

        this.isInitialized = true;
        console.log('✅ Fallback data loaded successfully');
    }

    // Retrieve relevant documents using RAG
    async retrieveRelevantDocuments(query, k = 5) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Generate embedding for the query
            const queryEmbedding = await this.generateEmbeddings([query]);
            
            // Search for similar documents
            const { distances, labels } = this.vectorStore.search(queryEmbedding[0], k);
            
            const relevantDocs = [];
            for (let i = 0; i < labels.length; i++) {
                const docIndex = labels[i];
                const doc = this.documents[docIndex];
                relevantDocs.push({
                    ...doc,
                    similarity: 1 - distances[i] // Convert distance to similarity
                });
            }

            return relevantDocs;
        } catch (error) {
            console.error('❌ Error retrieving documents:', error);
            return [];
        }
    }

    // Generate RAG-enhanced response
    async generateRAGResponse(query, userContext = {}) {
        try {
            // Retrieve relevant documents
            const relevantDocs = await this.retrieveRelevantDocuments(query, 5);
            
            // Build context from relevant documents
            const context = relevantDocs.map(doc => 
                `Source: ${doc.source}\nContent: ${doc.text}`
            ).join('\n\n');

            // Create enhanced prompt with RAG context
            const systemPrompt = `You are a knowledgeable legal assistant specializing in British Columbia, Canada law. You have access to current BC legal documents and statutes.

Use the following relevant BC legal information to provide accurate, specific guidance:

${context}

Based on this information and the user's query, provide comprehensive legal guidance that:
1. References specific BC laws and regulations
2. Provides accurate information
3. Suggests appropriate next steps
4. Includes relevant contact information for BC legal resources

Always remind users that this is general legal information and they should consult with qualified attorneys for specific legal matters.`;

            const userPrompt = `User Query: ${query}

User Context:
- Location: ${userContext.location || 'Not specified'}
- User Type: ${userContext.userType || 'Not specified'}
- Demographics: ${JSON.stringify(userContext.demographics || {})}

Please provide a comprehensive legal analysis based on the relevant BC legal documents provided above.`;

            // Call OpenAI with RAG-enhanced context
            const completion = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                max_tokens: 3000,
                temperature: 0.7,
            });

            return {
                response: completion.choices[0].message.content,
                sources: relevantDocs.map(doc => ({
                    title: doc.source,
                    url: doc.url,
                    similarity: doc.similarity
                }))
            };

        } catch (error) {
            console.error('❌ Error generating RAG response:', error);
            throw error;
        }
    }
}

module.exports = BCLegalRAG;
