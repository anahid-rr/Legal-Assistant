// Recommendation System for Legal Assistant
// Uses vector embeddings to provide personalized lawyer and resource recommendations

const fs = require('fs');
const path = require('path');

class RecommendationSystem {
    constructor() {
        this.lawyersData = null;
        this.resourcesData = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            console.log('🔄 Initializing recommendation system...');
            
            // Load lawyers data
            const lawyersPath = path.join(__dirname, 'data', 'lawyers_embeddings.json');
            const lawyersContent = fs.readFileSync(lawyersPath, 'utf8');
            this.lawyersData = JSON.parse(lawyersContent);
            
            // Load resources data
            const resourcesPath = path.join(__dirname, 'data', 'all_pdfs_embeddings.json');
            const resourcesContent = fs.readFileSync(resourcesPath, 'utf8');
            this.resourcesData = JSON.parse(resourcesContent);
            
            this.isInitialized = true;
            console.log('✅ Recommendation system initialized successfully');
            console.log(`📊 Loaded ${this.lawyersData.length} lawyers and ${this.resourcesData.length} resources`);
            
        } catch (error) {
            console.error('❌ Error initializing recommendation system:', error);
            this.isInitialized = false;
        }
    }

    // Calculate cosine similarity between two vectors
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have the same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }

    // Generate embedding for user query using simple keyword matching
    generateQueryEmbedding(query, userInfo, targetDimension = 1536) {
        // This is a simplified approach - in production, you'd use OpenAI's embedding API
        const keywords = this.extractKeywords(query, userInfo);
        const embedding = new Array(targetDimension).fill(0);
        
        // Simple keyword-based scoring (in production, use actual embedding API)
        const keywordWeights = {
            'family': 0.8, 'divorce': 0.9, 'custody': 0.85, 'support': 0.8,
            'employment': 0.8, 'workplace': 0.85, 'discrimination': 0.9,
            'criminal': 0.9, 'defense': 0.85, 'charges': 0.8,
            'immigration': 0.9, 'visa': 0.85, 'citizenship': 0.8,
            'personal': 0.7, 'injury': 0.8, 'accident': 0.75,
            'business': 0.8, 'contract': 0.85, 'commercial': 0.8,
            'real': 0.7, 'estate': 0.8, 'property': 0.75,
            'wills': 0.8, 'estate': 0.8, 'probate': 0.75,
            'human': 0.9, 'rights': 0.9, 'discrimination': 0.9,
            'aboriginal': 0.8, 'indigenous': 0.8, 'first': 0.8,
            'lgbtq': 0.8, 'lgbt': 0.8, 'transgender': 0.8,
            'disability': 0.8, 'accessibility': 0.8,
            'senior': 0.7, 'elder': 0.7, 'pension': 0.7,
            'low': 0.7, 'income': 0.7, 'poverty': 0.7,
            'free': 0.8, 'legal': 0.9, 'aid': 0.8
        };

        keywords.forEach(keyword => {
            const weight = keywordWeights[keyword.toLowerCase()] || 0.1;
            const index = this.hashKeyword(keyword) % embedding.length;
            embedding[index] = weight;
        });

        // Add some random noise to make it more realistic
        for (let i = 0; i < embedding.length; i++) {
            if (embedding[i] === 0) {
                embedding[i] = (Math.random() - 0.5) * 0.1; // Small random values
            }
        }

        return embedding;
    }

    extractKeywords(query, userInfo) {
        const text = `${query} ${userInfo.legalMatter} ${userInfo.legalType}`.toLowerCase();
        const keywords = [];
        
        // Extract legal keywords
        const legalTerms = [
            'family', 'divorce', 'custody', 'support', 'alimony', 'separation',
            'employment', 'workplace', 'discrimination', 'harassment', 'termination',
            'criminal', 'defense', 'charges', 'bail', 'sentencing',
            'immigration', 'visa', 'citizenship', 'deportation', 'refugee',
            'personal', 'injury', 'accident', 'negligence', 'liability',
            'business', 'contract', 'commercial', 'partnership', 'corporation',
            'real', 'estate', 'property', 'landlord', 'tenant', 'mortgage',
            'wills', 'estate', 'probate', 'inheritance', 'trust',
            'human', 'rights', 'discrimination', 'equality', 'freedom',
            'aboriginal', 'indigenous', 'first', 'nations', 'treaty',
            'lgbtq', 'lgbt', 'transgender', 'sexual', 'orientation',
            'disability', 'accessibility', 'accommodation',
            'senior', 'elder', 'pension', 'retirement',
            'low', 'income', 'poverty', 'welfare', 'assistance',
            'free', 'legal', 'aid', 'pro', 'bono'
        ];

        legalTerms.forEach(term => {
            if (text.includes(term)) {
                keywords.push(term);
            }
        });

        // Add demographic-specific keywords
        if (userInfo.firstNation) keywords.push('aboriginal', 'indigenous', 'first nations');
        if (userInfo.lgbtq) keywords.push('lgbtq', 'lgbt', 'sexual orientation');
        if (userInfo.disability) keywords.push('disability', 'accessibility');
        if (userInfo.senior) keywords.push('senior', 'elder');
        if (userInfo.lowIncome) keywords.push('low income', 'poverty', 'free legal aid');

        return [...new Set(keywords)]; // Remove duplicates
    }

    hashKeyword(keyword) {
        let hash = 0;
        for (let i = 0; i < keyword.length; i++) {
            const char = keyword.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    // Find best matching lawyers
    findMatchingLawyers(query, userInfo, limit = 5) {
        if (!this.isInitialized) {
            throw new Error('Recommendation system not initialized');
        }

        const queryEmbedding = this.generateQueryEmbedding(query, userInfo, 384);
        const lawyerScores = [];

        this.lawyersData.forEach(lawyer => {
            try {
                // Check if embedding dimensions match
                if (!lawyer.embedding || lawyer.embedding.length !== queryEmbedding.length) {
                    console.warn(`Skipping lawyer ${lawyer.Name} with mismatched embedding dimension: ${lawyer.embedding?.length || 'undefined'} vs ${queryEmbedding.length}`);
                    return;
                }

                const similarity = this.cosineSimilarity(queryEmbedding, lawyer.embedding);
                const specialtyMatch = this.calculateSpecialtyMatch(lawyer.Specialty, userInfo.legalType);
                const locationMatch = this.calculateLocationMatch(lawyer.Location, userInfo.location);
                const demographicMatch = this.calculateDemographicMatch(lawyer, userInfo);
                const feeMatch = this.calculateFeeMatch(lawyer.FeeStructure, userInfo.lowIncome);

                const totalScore = (similarity * 0.4) + 
                                 (specialtyMatch * 0.3) + 
                                 (locationMatch * 0.1) + 
                                 (demographicMatch * 0.1) + 
                                 (feeMatch * 0.1);

                lawyerScores.push({
                    lawyer,
                    score: totalScore,
                    similarity,
                    specialtyMatch,
                    locationMatch,
                    demographicMatch,
                    feeMatch
                });
            } catch (error) {
                console.warn(`Error processing lawyer ${lawyer.Name}:`, error.message);
            }
        });

        return lawyerScores
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => ({
                name: item.lawyer.Name,
                email: item.lawyer.Email,
                phone: item.lawyer.Phone,
                location: item.lawyer.Location,
                specialty: item.lawyer.Specialty,
                feeStructure: item.lawyer.FeeStructure,
                languages: item.lawyer.Languages,
                website: item.lawyer.Website,
                score: item.score,
                matchReasons: this.getMatchReasons(item)
            }));
    }

    // Find relevant resources
    findRelevantResources(query, userInfo, limit = 5) {
        if (!this.isInitialized) {
            throw new Error('Recommendation system not initialized');
        }

        const queryEmbedding = this.generateQueryEmbedding(query, userInfo, 384);
        const resourceScores = [];

        this.resourcesData.forEach(resource => {
            try {
                // Check if embedding dimensions match
                if (!resource.embedding || resource.embedding.length !== queryEmbedding.length) {
                    console.warn(`Skipping resource with mismatched embedding dimension: ${resource.embedding?.length || 'undefined'} vs ${queryEmbedding.length}`);
                    return;
                }

                const similarity = this.cosineSimilarity(queryEmbedding, resource.embedding);
                const contentMatch = this.calculateContentMatch(resource.text, userInfo.legalType);
                const demographicMatch = this.calculateResourceDemographicMatch(resource.text, userInfo);

                const totalScore = (similarity * 0.6) + (contentMatch * 0.3) + (demographicMatch * 0.1);

                resourceScores.push({
                    resource,
                    score: totalScore,
                    similarity,
                    contentMatch,
                    demographicMatch
                });
            } catch (error) {
                console.warn(`Error processing resource:`, error.message);
            }
        });

        return resourceScores
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => ({
                source: item.resource.source,
                text: item.resource.text.substring(0, 200) + '...',
                score: item.score,
                relevance: this.getRelevanceDescription(item.score)
            }));
    }

    // Helper methods for matching
    calculateSpecialtyMatch(specialty, legalType) {
        if (!specialty || !legalType) return 0;
        
        const specialtyLower = specialty.toLowerCase();
        const legalTypeLower = legalType.toLowerCase();
        
        if (specialtyLower.includes(legalTypeLower)) return 1.0;
        if (specialtyLower.includes('family') && legalTypeLower.includes('family')) return 0.9;
        if (specialtyLower.includes('employment') && legalTypeLower.includes('employment')) return 0.9;
        if (specialtyLower.includes('criminal') && legalTypeLower.includes('criminal')) return 0.9;
        if (specialtyLower.includes('immigration') && legalTypeLower.includes('immigration')) return 0.9;
        
        return 0.3; // Default partial match
    }

    calculateLocationMatch(lawyerLocation, userLocation) {
        if (!lawyerLocation || !userLocation) return 0.5;
        
        const lawyerLoc = lawyerLocation.toLowerCase();
        const userLoc = userLocation.toLowerCase();
        
        if (lawyerLoc.includes('b.c.') || lawyerLoc.includes('british columbia')) return 0.8;
        if (lawyerLoc.includes(userLoc)) return 1.0;
        if (userLoc.includes(lawyerLoc)) return 0.9;
        
        return 0.5; // Default neutral match
    }

    calculateDemographicMatch(lawyer, userInfo) {
        let score = 0.5; // Base score
        
        // Check if lawyer specializes in demographic-specific issues
        const specialty = lawyer.Specialty ? lawyer.Specialty.toLowerCase() : '';
        
        if (userInfo.firstNation && specialty.includes('aboriginal')) score += 0.3;
        if (userInfo.lgbtq && specialty.includes('lgbt')) score += 0.3;
        if (userInfo.disability && specialty.includes('disability')) score += 0.3;
        if (userInfo.senior && specialty.includes('elder')) score += 0.3;
        
        return Math.min(score, 1.0);
    }

    calculateFeeMatch(feeStructure, isLowIncome) {
        if (!feeStructure) return 0.5;
        
        const fee = feeStructure.toLowerCase();
        
        if (isLowIncome) {
            if (fee.includes('free') || fee.includes('pro bono')) return 1.0;
            if (fee.includes('low-cost') || fee.includes('sliding')) return 0.8;
            if (fee.includes('n/a')) return 0.6;
        }
        
        return 0.5; // Neutral for non-low-income users
    }

    calculateContentMatch(text, legalType) {
        if (!text || !legalType) return 0;
        
        const textLower = text.toLowerCase();
        const legalTypeLower = legalType.toLowerCase();
        
        if (textLower.includes(legalTypeLower)) return 1.0;
        
        // Check for related terms
        const relatedTerms = {
            'family': ['divorce', 'custody', 'support', 'separation'],
            'employment': ['workplace', 'discrimination', 'harassment', 'termination'],
            'criminal': ['defense', 'charges', 'bail', 'sentencing'],
            'immigration': ['visa', 'citizenship', 'deportation', 'refugee']
        };
        
        const terms = relatedTerms[legalTypeLower] || [];
        for (const term of terms) {
            if (textLower.includes(term)) return 0.8;
        }
        
        return 0.3; // Default partial match
    }

    calculateResourceDemographicMatch(text, userInfo) {
        if (!text) return 0;
        
        const textLower = text.toLowerCase();
        let score = 0.5;
        
        if (userInfo.firstNation && textLower.includes('aboriginal')) score += 0.2;
        if (userInfo.lgbtq && textLower.includes('lgbt')) score += 0.2;
        if (userInfo.disability && textLower.includes('disability')) score += 0.2;
        if (userInfo.senior && textLower.includes('senior')) score += 0.2;
        if (userInfo.lowIncome && textLower.includes('free')) score += 0.2;
        
        return Math.min(score, 1.0);
    }

    getMatchReasons(item) {
        const reasons = [];
        
        if (item.similarity > 0.7) reasons.push('High relevance to your legal matter');
        if (item.specialtyMatch > 0.8) reasons.push('Specializes in your area of law');
        if (item.locationMatch > 0.8) reasons.push('Located in your area');
        if (item.demographicMatch > 0.7) reasons.push('Experienced with your demographic');
        if (item.feeMatch > 0.8) reasons.push('Offers appropriate fee structure');
        
        return reasons.length > 0 ? reasons : ['General legal assistance available'];
    }

    getRelevanceDescription(score) {
        if (score > 0.8) return 'Highly relevant';
        if (score > 0.6) return 'Very relevant';
        if (score > 0.4) return 'Moderately relevant';
        return 'Somewhat relevant';
    }

    // Main method to get comprehensive recommendations
    async getRecommendations(query, userInfo) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const lawyers = this.findMatchingLawyers(query, userInfo, 5);
            const resources = this.findRelevantResources(query, userInfo, 5);
            
            return {
                lawyers: lawyers,
                resources: resources,
                summary: this.generateSummary(lawyers, resources, userInfo)
            };
        } catch (error) {
            console.error('Error generating recommendations:', error);
            return {
                lawyers: [],
                resources: [],
                summary: 'Unable to generate recommendations at this time. Please try again later.',
                error: error.message
            };
        }
    }

    generateSummary(lawyers, resources, userInfo) {
        const lawyerCount = lawyers.length;
        const resourceCount = resources.length;
        
        let summary = `Based on your ${userInfo.legalType} legal matter, I found ${lawyerCount} qualified lawyers and ${resourceCount} relevant resources. `;
        
        if (lawyerCount > 0) {
            const topLawyer = lawyers[0];
            summary += `The top recommendation is ${topLawyer.name} in ${topLawyer.location}, `;
            summary += `specializing in ${topLawyer.specialty}. `;
        }
        
        if (userInfo.lowIncome) {
            summary += 'Several free or low-cost options are available. ';
        }
        
        summary += 'Please review the detailed recommendations below and contact the lawyers directly for consultations.';
        
        return summary;
    }
}

module.exports = RecommendationSystem;
