// Legal Assistant App JavaScript

class LegalAssistant {
    constructor() {
        this.form = document.getElementById('legal-form');
        this.formSection = document.getElementById('form-section');
        this.reportSection = document.getElementById('report-section');
        this.reportContent = document.getElementById('report-content');
        this.submitBtn = document.getElementById('submit-btn');
        this.newReportBtn = document.getElementById('new-report-btn');
        
        console.log('Elements found:', {
            form: !!this.form,
            formSection: !!this.formSection,
            reportSection: !!this.reportSection,
            reportContent: !!this.reportContent,
            submitBtn: !!this.submitBtn,
            newReportBtn: !!this.newReportBtn
        });
        
        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.newReportBtn.addEventListener('click', () => this.showForm());
        this.initSmoothScrolling();
    }

    initSmoothScrolling() {
        // Add smooth scrolling to all anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        console.log('Form submitted');
        
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());
        
        // Get checkbox values
        data.firstNation = document.getElementById('first-nation').checked;
        data.lowIncome = document.getElementById('low-income').checked;
        data.disability = document.getElementById('disability').checked;
        data.lgbtq = document.getElementById('lgbtq').checked;
        data.visibleMinority = document.getElementById('visible-minority').checked;
        data.senior = document.getElementById('senior').checked;
        
        console.log('Form data:', data);
        
        // Validate required fields
        if (!data.email || !data.location || !data.userType || !data.legalType || !data.legalMatter) {
            alert('Please fill in all required fields (marked with *)');
            return;
        }
        
        this.showLoading();
        
        try {
            const report = await this.generateReport(data);
            console.log('Report generated:', report);
            this.displayReport(report);
            this.showReport();
        } catch (error) {
            console.error('Error generating report:', error);
            this.hideLoading();
            alert('Error generating report: ' + error.message + '\n\nPlease check your internet connection and try again.');
        }
    }

    showLoading() {
        this.submitBtn.disabled = true;
        this.submitBtn.querySelector('.btn-text').style.display = 'none';
        this.submitBtn.querySelector('.btn-loading').style.display = 'flex';
    }

    hideLoading() {
        this.submitBtn.disabled = false;
        this.submitBtn.querySelector('.btn-text').style.display = 'block';
        this.submitBtn.querySelector('.btn-loading').style.display = 'none';
    }

    async generateReport(data) {
        const prompt = this.buildPrompt(data);
        console.log('Generated prompt:', prompt);
        
        try {
            console.log('Calling OpenAI API endpoint...');
            const response = await fetch('/api/generate-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    formData: data,
                    prompt: prompt
                })
            });
            
            console.log('API response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('API result:', result);
            
            if (result.success) {
                console.log('OpenAI report generated successfully!');
                console.log('RAG enabled:', result.ragEnabled);
                console.log('Sources:', result.sources);
                
                // Store sources, risk assessment, and recommendations for display
                this.sources = result.sources || [];
                this.ragEnabled = result.ragEnabled || false;
                this.riskAssessment = result.riskAssessment || null;
                this.recommendations = result.recommendations || null;
                
                return result.report;
            } else {
                throw new Error(result.error || 'Failed to generate report');
            }
        } catch (error) {
            console.error('Error calling OpenAI API:', error);
            console.log('Falling back to mock report');
            return this.generateMockReport(data);
        }
        
    }

    buildPrompt(data) {
        return `
        Generate a comprehensive legal assistance report for the following situation in British Columbia, Canada:
        
        Personal Information:
        - Email: ${data.email}
        - Location: ${data.location}, BC, Canada
        - User Type: ${data.userType}
        
        Legal Matter: ${data.legalMatter}
        Legal Type: ${data.legalType}
        
        Demographics:
        - First Nations: ${data.firstNation ? 'Yes' : 'No'}
        - Low Income: ${data.lowIncome ? 'Yes' : 'No'}
        - Person with Disability: ${data.disability ? 'Yes' : 'No'}
        - LGBTQ2S+: ${data.lgbtq ? 'Yes' : 'No'}
        - Visible Minority: ${data.visibleMinority ? 'Yes' : 'No'}
        - Senior (65+): ${data.senior ? 'Yes' : 'No'}
        
        Please provide a BC-specific legal assistance report including:
        1. Legal analysis of the situation under BC and Canadian law
        2. Relevant BC Employment Standards Act, Human Rights Code, and other applicable laws
        3. Recommended actions and next steps
        4. BC-specific resources and assistance programs
        5. Contact information for relevant BC legal aid organizations
        6. Important deadlines and considerations under BC law
        don't need confidence score in the report
        `;
    }

    generateMockReport(data) {
        console.log('Generating mock report with data:', data);
        
        const legalType = data.legalType || 'Not specified';
        const userType = data.userType || 'Not specified';
        const location = data.location || 'Not specified';
        const isLowIncome = data.lowIncome;
        const isFirstNation = data.firstNation;
        const isVisibleMinority = data.visibleMinority;
        const hasDisability = data.disability;
        const isLGBTQ = data.lgbtq;
        const isSenior = data.senior;
        
        let report = `
            <h3>BC Legal Analysis</h3>
            <p>Based on your situation involving <strong>${legalType}</strong> as a <strong>${userType}</strong> in <strong>${location}, BC</strong>, here's a comprehensive analysis of your legal matter:</p>
            
            <div class="highlight">
                <h4>Summary of Your Situation</h4>
                <p>${data.legalMatter || 'No description provided'}</p>
            </div>
        `;

        // Add specific guidance based on legal type
        switch(legalType) {
            case 'employment':
                report += this.getEmploymentGuidance(data);
                break;
            // case 'family':
            //     report += this.getFamilyLawGuidance(data);
            //     break;
            // case 'housing':
            //     report += this.getHousingGuidance(data);
            //     break;
            // case 'immigration':
            //     report += this.getImmigrationGuidance(data);
            //     break;
            default:
                report += this.getGeneralGuidance(data);
        }

        // Add resources based on demographics
        report += this.getDemographicResources(data);

        // Add general resources
        report += this.getGeneralResources(data);

        // Add next steps
        report += this.getNextSteps(data);

        console.log('Mock report generated successfully');
        return report;
    }

    

    getDemographicResources(data) {
        let resources = '<h3>Specialized Resources for Your Situation</h3>';
        
        if (data.firstNation) {
            resources += `
                <div class="info">
                    <h4>First Nation/Indigenous Resources</h4>
                    <ul>
                        <li>Native American Rights Fund (NARF)</li>
                        <li>Indigenous Legal Services organizations</li>
                        <li>Tribal legal aid programs</li>
                        <li>Bureau of Indian Affairs legal resources</li>
                    </ul>
                </div>
            `;
        }
        
        if (data.lgbtq) {
            resources += `
                <div class="info">
                    <h4>LGBTQ2S+ Resources in BC</h4>
                    <ul>
                        <li>Qmunity - BC's Queer Resource Centre</li>
                        <li>BC Human Rights Tribunal</li>
                        <li>Trans Care BC</li>
                        <li>Community Legal Assistance Society (CLAS)</li>
                        <li>Pivot Legal Society</li>
                    </ul>
                </div>
            `;
        }
        
        if (data.visibleMinority) {
            resources += `
                <div class="info">
                    <h4>Visible Minority Resources in BC</h4>
                    <ul>
                        <li>BC Human Rights Tribunal</li>
                        <li>Community Legal Assistance Society (CLAS)</li>
                        <li>Multicultural Legal Services</li>
                        <li>BC Civil Liberties Association</li>
                        <li>Local cultural community centers</li>
                    </ul>
                </div>
            `;
        }
        
        if (data.senior) {
            resources += `
                <div class="info">
                    <h4>Senior Citizen Resources in BC</h4>
                    <ul>
                        <li>BC Seniors Advocate</li>
                        <li>Community Legal Assistance Society (CLAS)</li>
                        <li>BC Law Institute</li>
                        <li>Seniors First BC</li>
                        <li>Local senior centers and legal clinics</li>
                    </ul>
                </div>
            `;
        }
        
        if (data.disability) {
            resources += `
                <div class="info">
                    <h4>Disability Rights Resources in BC</h4>
                    <ul>
                        <li>BC Human Rights Tribunal</li>
                        <li>Disability Alliance BC</li>
                        <li>Community Legal Assistance Society (CLAS)</li>
                        <li>BC Public Interest Advocacy Centre</li>
                        <li>Accessible Canada Act compliance resources</li>
                    </ul>
                </div>
            `;
        }
        
        if (data.lowIncome) {
            resources += `
                <div class="info">
                    <h4>Low-Income Legal Resources in BC</h4>
                    <ul>
                        <li>Legal Aid BC - Free legal services for qualifying individuals</li>
                        <li>Community Legal Assistance Society (CLAS)</li>
                        <li>Access Pro Bono - Free legal help</li>
                        <li>Law school legal clinics (UBC, UVic)</li>
                        <li>BC Public Interest Advocacy Centre</li>
                        <li>Pivot Legal Society</li>
                    </ul>
                </div>
            `;
        }
        
        return resources;
    }

    getGeneralResources(data) {
        return `
            <h3>BC Legal Resources</h3>
            <div class="highlight">
                <h4>Immediate Help in BC</h4>
                <ul>
                    <li><strong>Legal Aid BC:</strong> Free legal services for qualifying individuals</li>
                    <li><strong>Law Society of BC:</strong> Lawyer referral service and complaints</li>
                    <li><strong>BC Courts Self-Help:</strong> Court forms and self-help resources</li>
                    <li><strong>Community Legal Clinics:</strong> Free legal advice in many BC communities</li>
                </ul>
            </div>
            
            <h4>BC Government Resources</h4>
            <ul>
                <li>BC Employment Standards Branch</li>
                <li>BC Human Rights Tribunal</li>
                <li>BC Civil Resolution Tribunal</li>
                <li>BC Provincial Court</li>
                <li>BC Supreme Court</li>
            </ul>
            
            <h4>Online BC Resources</h4>
            <ul>
                <li>BC Laws website (legislation.bc.ca)</li>
                <li>BC Courts website</li>
                <li>Legal Aid BC website</li>
                <li>BC Human Rights Tribunal website</li>
            </ul>
        `;
    }

    getNextSteps(data) {
        const urgency = data.urgency;
        let urgencyMessage = '';
        
        switch(urgency) {
            case 'high':
                urgencyMessage = '<div class="warning"><h4>High Priority Action Required</h4><p>Given the urgency of your situation, you should take immediate action. Consider contacting an attorney or legal aid organization today.</p></div>';
                break;
            case 'medium':
                urgencyMessage = '<div class="info"><h4>Moderate Priority</h4><p>You should take action within the next few days to protect your rights and interests.</p></div>';
                break;
            case 'low':
                urgencyMessage = '<div class="info"><h4>Lower Priority</h4><p>You have some time to research and prepare, but don\'t delay indefinitely.</p></div>';
                break;
        }
        
        return `
            <h3>Recommended Next Steps</h3>
            ${urgencyMessage}
            
            <h4>Immediate Actions (Next 1-3 Days):</h4>
            <ol>
                <li><strong>Document Your Situation:</strong> Write down all relevant details, dates, and people involved</li>
                <li><strong>Gather Evidence:</strong> Collect any relevant documents, emails, photos, or other evidence</li>
                <li><strong>Research Local Resources:</strong> Look up legal aid organizations and attorneys in your area</li>
                <li><strong>Check Deadlines:</strong> Determine if there are any time limits for taking action</li>
            </ol>
            
            <h4>Short-term Actions (Next 1-2 Weeks):</h4>
            <ol>
                <li><strong>Consult with an Attorney:</strong> Schedule consultations with qualified attorneys</li>
                <li><strong>Apply for Legal Aid:</strong> If you qualify, apply for free or low-cost legal assistance</li>
                <li><strong>File Necessary Documents:</strong> Complete and file any required legal documents</li>
                <li><strong>Follow Up:</strong> Stay in contact with legal professionals and follow their advice</li>
            </ol>
            
            <div class="warning">
                <h4>Important Disclaimer</h4>
                <p>This report provides general legal information only and does not constitute legal advice. Laws vary by jurisdiction and individual circumstances. You should consult with a qualified attorney for advice specific to your situation.</p>
            </div>
        `;
    }

    displayReport(report) {
        console.log('Displaying report:', report);
        if (this.reportContent) {
            let fullReport = report;
            
            // Add risk assessment section if available
            if (this.riskAssessment) {
                console.log('Adding risk assessment to report');
                const riskAssessmentHtml = this.generateRiskAssessmentHTML(this.riskAssessment);
                fullReport = riskAssessmentHtml + fullReport;
            }
            
            // Add sources section if RAG is enabled
            if (this.ragEnabled && this.sources && this.sources.length > 0) {
                const sourcesHtml = `
                    <div class="sources-section">
                        <h3>📚 Legal Sources Used</h3>
                        <p>This analysis was enhanced using the following BC legal documents:</p>
                        <ul class="sources-list">
                            ${this.sources.map(source => `
                                <li>
                                    <strong>${source.title}</strong>
                                    ${source.url ? `<br><a href="${source.url}" target="_blank" rel="noopener">View Source</a>` : ''}
                                    <span class="similarity">(${Math.round(source.similarity * 100)}% relevant)</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
                fullReport += sourcesHtml;
            }

            // Add recommendations section if available
            if (this.recommendations) {
                console.log('Adding recommendations to report');
                const recommendationsHtml = this.generateRecommendationsHTML(this.recommendations);
                fullReport += recommendationsHtml;
            }
            
            this.reportContent.innerHTML = fullReport;
            console.log('Report content updated');
        } else {
            console.error('Report content element not found!');
        }
    }

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
                
                <div class="risk-legend">
                    <h4>📊 Risk Level Guide:</h4>
                    <div class="legend-items">
                        <div class="legend-item">
                            <span class="legend-color risk-red">🔴</span>
                            <span class="legend-text"><strong>HIGH RISK:</strong> Immediate legal action required, significant consequences possible</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color risk-yellow">🟡</span>
                            <span class="legend-text"><strong>MEDIUM RISK:</strong> Legal attention needed soon, moderate consequences possible</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color risk-green">🟢</span>
                            <span class="legend-text"><strong>LOW RISK:</strong> Routine legal matter, minimal consequences expected</span>
                        </div>
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
                
                <div class="risk-next-steps">
                    <h4>🚀 Next Steps:</h4>
                    <p>${riskAssessment.nextSteps}</p>
                </div>
            </div>
        `;
    }

    // Helper methods for risk assessment formatting
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

    generateRecommendationsHTML(recommendations) {
        if (!recommendations || (!recommendations.lawyers.length && !recommendations.resources.length)) {
            return `
                <div class="recommendations-section">
                    <h3>💡 Personalized Recommendations</h3>
                    <p>No specific recommendations available at this time. Please consult with a qualified attorney for personalized legal advice.</p>
                </div>
            `;
        }

        let html = `
            <div class="recommendations-section">
                <h3>💡 Personalized Recommendations</h3>
                <p class="recommendations-summary">${recommendations.summary}</p>
        `;

        // Add lawyers section
        if (recommendations.lawyers && recommendations.lawyers.length > 0) {
            html += `
                <div class="lawyers-section">
                    <h4>👨‍💼 Recommended Lawyers</h4>
                    <div class="lawyers-grid">
                        ${recommendations.lawyers.map(lawyer => `
                            <div class="lawyer-card">
                                <div class="lawyer-header">
                                    <h5>${lawyer.name}</h5>
                                </div>
                                <div class="lawyer-details">
                                    <p><strong>📍 Location:</strong> ${lawyer.location}</p>
                                    <p><strong>⚖️ Specialty:</strong> ${lawyer.specialty}</p>
                                    ${lawyer.feeStructure && lawyer.feeStructure !== 'N/A' ? `<p><strong>💰 Fee Structure:</strong> ${lawyer.feeStructure}</p>` : ''}
                                    ${lawyer.languages && lawyer.languages !== 'N/A' ? `<p><strong>🗣️ Languages:</strong> ${lawyer.languages}</p>` : ''}
                                </div>
                                <div class="lawyer-contact">
                                    ${lawyer.phone && lawyer.phone !== 'N/A' ? `<p><strong>📞 Phone:</strong> <a href="tel:${lawyer.phone}">${lawyer.phone}</a></p>` : ''}
                                    ${lawyer.email && lawyer.email !== 'N/A' ? `<p><strong>📧 Email:</strong> <a href="mailto:${lawyer.email}">${lawyer.email}</a></p>` : ''}
                                    ${lawyer.website && lawyer.website !== 'N/A' ? `<p><strong>🌐 Website:</strong> <a href="${lawyer.website}" target="_blank" rel="noopener">Visit Website</a></p>` : ''}
                                </div>
                                <div class="lawyer-reasons">
                                    <h6>Why this lawyer matches your needs:</h6>
                                    <ul>
                                        ${lawyer.matchReasons.map(reason => `<li>${reason}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Add resources section
        if (recommendations.resources && recommendations.resources.length > 0) {
            html += `
                <div class="resources-section">
                    <h4>📚 Relevant Legal Resources</h4>
                    <div class="resources-list">
                        ${recommendations.resources.map(resource => `
                            <div class="resource-card">
                                <div class="resource-header">
                                    <h5>${resource.source}</h5>
                                </div>
                                <div class="resource-content">
                                    <p>${resource.text}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        html += `
                <div class="recommendations-footer">
                    <p><strong>⚠️ Important:</strong> These recommendations are based on your provided information and publicly available data. Always verify credentials and conduct your own research before engaging with any legal professional.</p>
                </div>
            </div>
        `;

        return html;
    }

    showReport() {
        console.log('Showing report...');
        this.hideLoading();
        console.log('Form section:', this.formSection);
        console.log('Report section:', this.reportSection);
        
        // Keep the form visible and show report below it
        if (this.reportSection) {
            this.reportSection.style.display = 'block';
            this.reportSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            console.error('Report section not found!');
        }
    }

    showForm() {
        // Hide the report section and reset the form
        if (this.reportSection) {
            this.reportSection.style.display = 'none';
        }
        if (this.form) {
            this.form.reset();
        }
        // Scroll back to the form
        if (this.formSection) {
            this.formSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showError(message) {
        this.hideLoading();
        if (this.reportContent) {
            this.reportContent.innerHTML = `
                <div class="warning">
                    <h3>Error Generating Report</h3>
                    <p>${message}</p>
                    <p>Please try again or contact support if the problem persists.</p>
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 15px;">
                        Try Again
                    </button>
                </div>
            `;
            this.showReport();
        } else {
            alert('Error: ' + message);
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LegalAssistant();
});

// Example of how to integrate with OpenAI API (commented out for demo)
/*
async function callOpenAI(prompt) {
    const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt: prompt,
            model: 'gpt-3.5-turbo',
            max_tokens: 2000,
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        throw new Error('Failed to generate report');
    }
    
    const data = await response.json();
    return data.report;
}
*/
