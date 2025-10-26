// Risk Assessment System for Legal Reports
// Analyzes legal reports and provides risk classification with color coding

const OpenAI = require('openai');

class LegalRiskAssessment {
    constructor(openaiApiKey) {
        this.openai = new OpenAI({ apiKey: openaiApiKey });
    }

    // Risk assessment prompt template using the comprehensive framework from risk assessment.txt
    getRiskAssessmentPrompt(legalReport, userContext) {
        return `
You are a legal AI assistant operating in British Columbia, Canada. For every interaction, you must evaluate the risk level of the client relying solely on your output and communicate this clearly.

RISK ASSESSMENT FRAMEWORK:

GREEN (Low Risk) - Client generally does not need to speak to a lawyer when these factors are present:

- The client's jurisdiction (British Columbia, Canada) is clearly established
- You have referenced legislation currently published on official BC/Canadian government websites or reputable law firm sources that clearly provide the answer
- The question has a straightforward, well-documented answer

YELLOW (Medium Risk) - Client should strongly consider speaking to a lawyer when ANY of these factors are present:

- The question requires a nuanced answer that is not black and white or binary yes/no
- The client's specific jurisdiction details are unclear
- Your answer ventures into legal advice because clear published guidance is not available
- Your answer is equivocating or uncertain
- The user has supplied a complex fact situation
- The issue relates to human rights (e.g., employment situations involving protected characteristics or minority group membership)
- You did not ask clarifying questions that a skilled lawyer would have asked
- The conversation has extensive back-and-forth Q&A, particularly if follow-up questions broadened rather than narrowed the scope
- The client references communications or legal documents you have not seen
- The client is expected to provide a formal response that could have prejudicial consequences
- The client's question relates to employment termination

RED (High Risk - Mandatory Lawyer Consultation) - Client MUST speak to a lawyer when ANY of these factors are present:

- You did not fully answer the question or stated you could not answer the question
- You provided advice that may be verifiably wrong
- The client's question relates to a crime, sexual harassment, physical aggression, or harassment
- Your response could significantly affect the client's legal rights, safety, or well-being

LEGAL REPORT TO ANALYZE:
${legalReport}

USER CONTEXT:
- Location: ${userContext.location || 'Not specified'}
- User Type: ${userContext.userType || 'Not specified'}
- Legal Issue: ${userContext.legalType || 'Not specified'}
- Demographics: ${JSON.stringify(userContext.demographics || {})}

RESPONSE PROTOCOL:

1. Answer the question to the best of your ability using available legal information
2. Assess the risk level based on the framework above
3. At the end of your response, clearly state:
   - The risk level (Green/Yellow/Red)
   - Which specific factors triggered this rating
   - Appropriate guidance about seeking legal counsel

RISK-APPROPRIATE RECOMMENDATIONS:

- Green: "Risk Level: GREEN. This appears to be straightforward legal information. However, if your situation has unique factors, consider consulting a lawyer."
- Yellow: "Risk Level: YELLOW. You should strongly consider speaking to a lawyer about this matter because [specific reasons]. This response provides general information but your situation may require professional legal advice."
- Red: "Risk Level: RED. You MUST speak to a lawyer about this matter because [specific reasons]. Do not rely solely on this information for decisions that could affect your legal rights, safety, or well-being."

CONSTRAINTS:

- Always assume the jurisdiction is British Columbia, Canada unless stated otherwise
- Never provide definitive legal advice on complex matters
- When in doubt between risk levels, choose the higher risk level
- Be transparent about limitations in your knowledge or the information provided
- Always remind users that you are an AI assistant, not a licensed lawyer

Please analyze the legal report and provide a JSON response with the following structure:

{
  "riskLevel": "GREEN|YELLOW|RED",
  "riskColor": "green|yellow|red",
  "confidence": 0.85,
  "primaryConcerns": ["list of main concerns that triggered this risk level"],
  "urgency": "immediate|within_week|within_month|no_rush",
  "recommendedActions": ["action1", "action2", "action3"],
  "timeSensitivity": "critical|urgent|moderate|low",
  "financialImpact": "high|medium|low|none",
  "legalComplexity": "complex|moderate|simple",
  "summary": "Brief explanation of the risk assessment",
  "nextSteps": "Specific immediate actions the user should take",
  "riskFactors": ["specific factors from the framework that triggered this rating"],
  "lawyerRecommendation": "Specific guidance about seeking legal counsel based on risk level"
}

Focus on:
1. Whether the jurisdiction is clearly established as BC, Canada
2. Whether the answer is straightforward and well-documented
3. Whether the question requires nuanced analysis
4. Whether the response ventures into legal advice territory
5. Whether there are complex fact situations or human rights issues
6. Whether the client needs to provide formal responses
7. Whether there are safety, criminal, or harassment concerns

Provide a thorough analysis based on the legal report content and user context using the BC-specific risk assessment framework.
`;
    }

    // Perform risk assessment on the legal report
    async assessRisk(legalReport, userContext) {
        try {
            console.log('🔍 Performing legal risk assessment...');
            
            const prompt = this.getRiskAssessmentPrompt(legalReport, userContext);
            
            const completion = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: `You are a legal AI assistant operating in British Columbia, Canada. For every interaction, you must evaluate the risk level of the client relying solely on your output and communicate this clearly.

RISK ASSESSMENT FRAMEWORK:

GREEN (Low Risk) - Client generally does not need to speak to a lawyer when these factors are present:
- The client's jurisdiction (British Columbia, Canada) is clearly established
- You have referenced legislation currently published on official BC/Canadian government websites or reputable law firm sources that clearly provide the answer
- The question has a straightforward, well-documented answer

YELLOW (Medium Risk) - Client should strongly consider speaking to a lawyer when ANY of these factors are present:
- The question requires a nuanced answer that is not black and white or binary yes/no
- The client's specific jurisdiction details are unclear
- Your answer ventures into legal advice because clear published guidance is not available
- Your answer is equivocating or uncertain
- The user has supplied a complex fact situation
- The issue relates to human rights (e.g., employment situations involving protected characteristics or minority group membership)
- You did not ask clarifying questions that a skilled lawyer would have asked
- The conversation has extensive back-and-forth Q&A, particularly if follow-up questions broadened rather than narrowed the scope
- The client references communications or legal documents you have not seen
- The client is expected to provide a formal response that could have prejudicial consequences
- The client's question relates to employment termination

RED (High Risk - Mandatory Lawyer Consultation) - Client MUST speak to a lawyer when ANY of these factors are present:
- You did not fully answer the question or stated you could not answer the question
- You provided advice that may be verifiably wrong
- The client's question relates to a crime, sexual harassment, physical aggression, or harassment
- Your response could significantly affect the client's legal rights, safety, or well-being

CONSTRAINTS:
- Always assume the jurisdiction is British Columbia, Canada unless stated otherwise
- Never provide definitive legal advice on complex matters
- When in doubt between risk levels, choose the higher risk level
- Be transparent about limitations in your knowledge or the information provided
- Always remind users that you are an AI assistant, not a licensed lawyer

Analyze legal reports and provide structured risk assessments with color-coded classifications. Always respond with valid JSON format using the BC-specific risk assessment framework above.`
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 1500,
                temperature: 0.3, // Lower temperature for more consistent risk assessment
            });

            const response = completion.choices[0].message.content;
            
            // Parse JSON response
            let riskAssessment;
            try {
                // Extract JSON from response (in case there's extra text)
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    riskAssessment = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON found in response');
                }
            } catch (parseError) {
                console.error('❌ Error parsing risk assessment JSON:', parseError);
                // Fallback risk assessment
                riskAssessment = this.createFallbackAssessment(legalReport);
            }

            console.log('✅ Risk assessment completed:', riskAssessment.riskLevel);
            return riskAssessment;

        } catch (error) {
            console.error('❌ Error in risk assessment:', error);
            return this.createFallbackAssessment(legalReport);
        }
    }

    // Create fallback risk assessment if AI fails
    createFallbackAssessment(legalReport) {
        // Simple keyword-based fallback assessment using BC risk framework
        const reportText = legalReport.toLowerCase();
        
        let riskLevel = 'GREEN';
        let riskColor = 'green';
        let urgency = 'no_rush';
        let riskFactors = [];
        
        // RED risk factors (High Risk - Mandatory Lawyer Consultation)
        if (reportText.includes('criminal') || reportText.includes('arrest') || 
            reportText.includes('charges') || reportText.includes('harassment') ||
            reportText.includes('sexual harassment') || reportText.includes('physical aggression') ||
            reportText.includes('cannot answer') || reportText.includes('unable to provide') ||
            reportText.includes('wrong advice') || reportText.includes('incorrect')) {
            riskLevel = 'RED';
            riskColor = 'red';
            urgency = 'immediate';
            riskFactors.push('Question relates to crime, harassment, or physical aggression');
            riskFactors.push('Response may be verifiably wrong or incomplete');
        }
        // YELLOW risk factors (Medium Risk - Should consider lawyer)
        else if (reportText.includes('employment') || reportText.includes('housing') ||
                 reportText.includes('discrimination') || reportText.includes('human rights') ||
                 reportText.includes('termination') || reportText.includes('complex') ||
                 reportText.includes('nuanced') || reportText.includes('unclear') ||
                 reportText.includes('formal response') || reportText.includes('prejudicial')) {
            riskLevel = 'YELLOW';
            riskColor = 'yellow';
            urgency = 'within_week';
            riskFactors.push('Question requires nuanced analysis or involves human rights');
            riskFactors.push('Complex fact situation or employment termination');
        }
        // GREEN risk factors (Low Risk - Generally straightforward)
        else if (reportText.includes('british columbia') || reportText.includes('bc') ||
                 reportText.includes('canada') || reportText.includes('legislation') ||
                 reportText.includes('straightforward') || reportText.includes('well-documented')) {
            riskLevel = 'GREEN';
            riskColor = 'green';
            urgency = 'no_rush';
            riskFactors.push('Jurisdiction clearly established as BC, Canada');
            riskFactors.push('Straightforward, well-documented answer');
        }

        // Generate appropriate lawyer recommendation based on risk level
        let lawyerRecommendation = '';
        if (riskLevel === 'RED') {
            lawyerRecommendation = 'You MUST speak to a lawyer about this matter because ' + riskFactors.join(', ') + '. Do not rely solely on this information for decisions that could affect your legal rights, safety, or well-being.';
        } else if (riskLevel === 'YELLOW') {
            lawyerRecommendation = 'You should strongly consider speaking to a lawyer about this matter because ' + riskFactors.join(', ') + '. This response provides general information but your situation may require professional legal advice.';
        } else {
            lawyerRecommendation = 'This appears to be straightforward legal information. However, if your situation has unique factors, consider consulting a lawyer.';
        }

        return {
            riskLevel,
            riskColor,
            confidence: 0.6,
            primaryConcerns: ['Automated assessment - manual review recommended'],
            urgency,
            recommendedActions: ['Consult with a qualified attorney for detailed assessment'],
            timeSensitivity: urgency,
            financialImpact: 'medium',
            legalComplexity: 'moderate',
            summary: 'Automated risk assessment based on keyword analysis using BC risk framework',
            nextSteps: 'Seek professional legal consultation for accurate assessment',
            riskFactors: riskFactors,
            lawyerRecommendation: lawyerRecommendation
        };
    }

    // Generate risk assessment HTML with color coding
    generateRiskAssessmentHTML(riskAssessment) {
        const colorClass = `risk-${riskAssessment.riskColor}`;
        const urgencyIcon = this.getUrgencyIcon(riskAssessment.urgency);
        const complexityIcon = this.getComplexityIcon(riskAssessment.legalComplexity);
        
        return `
            <div class="risk-assessment ${colorClass}">
                <div class="risk-header">
                    <h3>🚨 Legal Risk Assessment</h3>
                    <div class="risk-badge ${colorClass}">
                        ${riskAssessment.riskLevel} RISK
                    </div>
                </div>
                
                <div class="risk-summary">
                    <p><strong>Summary:</strong> ${riskAssessment.summary}</p>
                    <p><strong>Confidence:</strong> ${Math.round(riskAssessment.confidence * 100)}%</p>
                </div>
                
                <div class="risk-details">
                    <div class="risk-item">
                        <span class="risk-label">⏰ Urgency:</span>
                        <span class="risk-value ${riskAssessment.urgency}">${urgencyIcon} ${this.formatUrgency(riskAssessment.urgency)}</span>
                    </div>
                    
                    <div class="risk-item">
                        <span class="risk-label">💰 Financial Impact:</span>
                        <span class="risk-value">${this.formatFinancialImpact(riskAssessment.financialImpact)}</span>
                    </div>
                    
                    <div class="risk-item">
                        <span class="risk-label">⚖️ Legal Complexity:</span>
                        <span class="risk-value">${complexityIcon} ${this.formatComplexity(riskAssessment.legalComplexity)}</span>
                    </div>
                </div>
                
                <div class="risk-concerns">
                    <h4>🎯 Primary Concerns:</h4>
                    <ul>
                        ${riskAssessment.primaryConcerns.map(concern => `<li>${concern}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="risk-actions">
                    <h4>📋 Recommended Actions:</h4>
                    <ol>
                        ${riskAssessment.recommendedActions.map(action => `<li>${action}</li>`).join('')}
                    </ol>
                </div>
                
                <div class="risk-factors">
                    <h4>🎯 Risk Factors:</h4>
                    <ul>
                        ${(riskAssessment.riskFactors || []).map(factor => `<li>${factor}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="risk-lawyer-recommendation">
                    <h4>⚖️ Legal Counsel Recommendation:</h4>
                    <p class="lawyer-recommendation ${riskAssessment.riskColor}">${riskAssessment.lawyerRecommendation || 'Please consult with a qualified attorney for your specific situation.'}</p>
                </div>
                
                <div class="risk-next-steps">
                    <h4>🚀 Next Steps:</h4>
                    <p>${riskAssessment.nextSteps}</p>
                </div>
            </div>
        `;
    }

    // Helper methods for formatting
    getUrgencyIcon(urgency) {
        const icons = {
            'immediate': '🚨',
            'within_week': '⚠️',
            'within_month': '📅',
            'no_rush': '✅'
        };
        return icons[urgency] || '📅';
    }

    getComplexityIcon(complexity) {
        const icons = {
            'complex': '🔴',
            'moderate': '🟡',
            'simple': '🟢'
        };
        return icons[complexity] || '🟡';
    }

    formatUrgency(urgency) {
        const formats = {
            'immediate': 'Immediate Action Required',
            'within_week': 'Action Needed This Week',
            'within_month': 'Action Needed This Month',
            'no_rush': 'No Immediate Rush'
        };
        return formats[urgency] || 'Unknown';
    }

    formatFinancialImpact(impact) {
        const formats = {
            'high': '🔴 High Financial Risk',
            'medium': '🟡 Moderate Financial Impact',
            'low': '🟢 Low Financial Impact',
            'none': '✅ No Financial Impact'
        };
        return formats[impact] || 'Unknown';
    }

    formatComplexity(complexity) {
        const formats = {
            'complex': 'Complex Legal Matter',
            'moderate': 'Moderate Complexity',
            'simple': 'Simple Legal Matter'
        };
        return formats[complexity] || 'Unknown';
    }
}

module.exports = LegalRiskAssessment;

