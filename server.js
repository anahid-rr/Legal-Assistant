// Express.js server for Legal Assistant App
// This is an example backend implementation

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const LegalRiskAssessment = require('./risk-assessment');
const RecommendationSystem = require('./recommendation-system');
require('dotenv').config();
// dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize RAG system
let ragSystem = null;

// Initialize Risk Assessment system
let riskAssessment = null;

// Initialize Recommendation system
let recommendationSystem = null;

// Check if API key is loaded
if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment variables!');
    console.error('Please make sure you have a .env file with your OpenAI API key.');
} else {
    console.log('✅ OpenAI API key loaded successfully');
    
    // Initialize Risk Assessment system only (RAG disabled for memory efficiency)
    riskAssessment = new LegalRiskAssessment(process.env.OPENAI_API_KEY);
    
    // Initialize Recommendation system
    recommendationSystem = new RecommendationSystem();
    await recommendationSystem.initialize();
    
    console.log('✅ Risk Assessment system initialized (RAG disabled for memory efficiency)');
    console.log('✅ Recommendation system initialized');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

// API endpoint to generate legal assistance report with RAG
app.post('/api/generate-report', async (req, res) => {
    try {
        console.log('📝 Received request for legal assistance report');
        const { formData, prompt } = req.body;
        
        // Use the prompt from the frontend or build one if not provided
        const finalPrompt = prompt || buildLegalPrompt(formData);
        console.log('📋 Using prompt:', finalPrompt.substring(0, 200) + '...');
        
        let report;
        let sources = [];
        
        // Use regular OpenAI API (RAG disabled for memory efficiency)
        console.log('🤖 Using OpenAI API for legal analysis...');
        
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are a knowledgeable legal assistant specializing in British Columbia, Canada law. You provide helpful, accurate, and comprehensive legal guidance specifically for BC residents. 

                    Your responses should:
                    - Focus on BC and Canadian law
                    - Reference specific BC legislation (Employment Standards Act, Human Rights Code, etc.)
                    - Provide BC-specific resources and contact information
                    - Be practical and actionable
                    - Always remind users that your advice is general information and they should consult with qualified attorneys for specific legal matters
                    - Format responses in HTML with proper headings, lists, and styling classes
                    
                    Include relevant BC legal resources, contact information for BC legal aid organizations, and specific next steps based on the user's location and demographics.`
                },
                {
                    role: "user",
                    content: finalPrompt
                }
            ],
            max_tokens: 3000,
            temperature: 0.7,
        });
        
        report = completion.choices[0].message.content;
        
        console.log('✅ Legal report generated, length:', report.length);
        
        // Perform risk assessment on the generated report
        let riskAssessmentResult = null;
        if (riskAssessment) {
            try {
                console.log('🔍 Performing risk assessment...');
                riskAssessmentResult = await riskAssessment.assessRisk(report, formData);
                console.log('✅ Risk assessment completed:', riskAssessmentResult.riskLevel);
            } catch (riskError) {
                console.error('❌ Risk assessment error:', riskError);
                // Provide fallback risk assessment if API fails
                riskAssessmentResult = {
                    riskLevel: 'MEDIUM',
                    riskColor: 'yellow',
                    confidence: 0.7,
                    primaryConcerns: ['Unable to perform full risk assessment due to API error'],
                    urgency: 'within_week',
                    recommendedActions: ['Consult with a qualified attorney for proper risk assessment'],
                    timeSensitivity: 'moderate',
                    financialImpact: 'medium',
                    legalComplexity: 'moderate',
                    summary: 'Risk assessment could not be completed due to API authentication error',
                    nextSteps: 'Please check your OpenAI API key and try again, or consult with a legal professional'
                };
            }
        }

        // Generate personalized recommendations
        let recommendations = null;
        if (recommendationSystem) {
            try {
                console.log('🔍 Generating personalized recommendations...');
                const query = `${formData.legalMatter} ${formData.legalType}`;
                recommendations = await recommendationSystem.getRecommendations(query, formData);
                console.log('✅ Recommendations generated:', recommendations.lawyers.length, 'lawyers,', recommendations.resources.length, 'resources');
            } catch (recError) {
                console.error('❌ Recommendation error:', recError);
                recommendations = {
                    lawyers: [],
                    resources: [],
                    summary: 'Unable to generate recommendations at this time. Please try again later.',
                    error: recError.message
                };
            }
        }
        
        res.json({
            success: true,
            report: report,
            sources: sources,
            ragEnabled: false, // RAG disabled for memory efficiency
            riskAssessment: riskAssessmentResult,
            recommendations: recommendations
        });
        
    } catch (error) {
        console.error('Error generating report:', error);
        
        // Provide fallback response with risk assessment
        const fallbackReport = `
            <div class="warning">
                <h3>⚠️ API Authentication Error</h3>
                <p>Unable to generate the legal report due to an API authentication error. Please check your OpenAI API key.</p>
                <p>In the meantime, here's some general guidance:</p>
                <ul>
                    <li>Consult with a qualified attorney for your specific legal matter</li>
                    <li>Contact BC Legal Aid for free legal assistance</li>
                    <li>Check the BC Courts website for self-help resources</li>
                </ul>
            </div>
        `;
        
        const fallbackRiskAssessment = {
            riskLevel: 'MEDIUM',
            riskColor: 'yellow',
            confidence: 0.6,
            primaryConcerns: ['API authentication error', 'Unable to provide specific legal analysis'],
            urgency: 'within_week',
            recommendedActions: [
                'Fix OpenAI API key configuration',
                'Consult with a qualified attorney',
                'Contact BC Legal Aid for assistance'
            ],
            timeSensitivity: 'moderate',
            financialImpact: 'medium',
            legalComplexity: 'moderate',
            summary: 'System error - please check API configuration and consult with legal professionals',
            nextSteps: 'Contact technical support and seek professional legal advice'
        };
        
        res.json({
            success: true,
            report: fallbackReport,
            sources: [],
            ragEnabled: false,
            riskAssessment: fallbackRiskAssessment,
            recommendations: {
                lawyers: [],
                resources: [],
                summary: 'Unable to generate recommendations due to system error. Please try again later.',
                error: 'System error - recommendations unavailable'
            }
        });
    }
});

function buildLegalPrompt(formData) {
    const {
        email,
        location,
        userType,
        legalMatter,
        legalType,
        firstNation,
        lowIncome,
        disability,
        lgbtq,
        visibleMinority,
        senior
    } = formData;
    
    return `
Generate a comprehensive legal assistance report for the following situation in British Columbia, Canada:

PERSONAL INFORMATION:
- Email: ${email}
- Location: ${location}, BC, Canada
- User Type: ${userType}

LEGAL MATTER: ${legalMatter}
LEGAL TYPE: ${legalType}

DEMOGRAPHICS:
- First Nations: ${firstNation ? 'Yes' : 'No'}
- Low Income: ${lowIncome ? 'Yes' : 'No'}
- Person with Disability: ${disability ? 'Yes' : 'No'}
- LGBTQ2S+: ${lgbtq ? 'Yes' : 'No'}
- Visible Minority: ${visibleMinority ? 'Yes' : 'No'}
- Senior (65+): ${senior ? 'Yes' : 'No'}

Please provide a BC-specific legal assistance report that includes:

1. **Legal Analysis**: Analysis of the legal situation under BC and Canadian law
2. **BC Legislation**: Relevant BC Employment Standards Act, Human Rights Code, and other applicable laws
3. **Rights and Protections**: Specific rights and protections under BC law
4. **Recommended Actions**: Specific steps the person should take
5. **BC Resources**: BC-specific legal aid organizations, government agencies, and assistance programs
6. **Demographic-Specific Resources**: Special resources based on their demographics (First Nations, LGBTQ2S+, disability, low-income, etc.)
7. **Next Steps**: Prioritized action plan with contact information
8. **Important Warnings**: Any critical deadlines, limitations, or considerations under BC law

Format the response in HTML with appropriate headings, lists, and styling classes for a web interface. Include specific BC contact information, phone numbers, and website links where appropriate.

IMPORTANT: Always include a disclaimer that this is general legal information and not professional legal advice, and that the person should consult with a qualified attorney for their specific situation.
`;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Legal Assistant API is running' });
});
app.get("/api/test-openai", async (req, res) => {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-0125",
            messages: [
                { role: "system", content: "You are a test assistant." },
                { role: "user", content: "Say hello." }
            ],
            max_tokens: 50
        });
        res.json({ result: completion.choices[0].message.content });
    } catch (err) {
        console.error("OpenAI test error:", err);
        res.status(500).json({ error: err.message });
    }
});
// ====
// Start server
app.listen(port, () => {
    console.log(`Legal Assistant server running on port ${port}`);
    console.log(`Open http://localhost:${port} to view the application`);
});

module.exports = app;
