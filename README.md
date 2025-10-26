# Legal Assistant App

A comprehensive legal assistance application that helps users get personalized legal guidance based on their specific situation, demographics, and legal needs.

## Features

- **Comprehensive Form**: Collects detailed information about legal matters, location, demographics, and urgency
- **AI-Powered Reports**: Generates personalized legal assistance reports using OpenAI
- **Demographic-Specific Resources**: Provides specialized resources for First Nation members, veterans, seniors, and people with disabilities
- **Income-Based Assistance**: Identifies low-income legal resources and assistance programs
- **Modern UI**: Beautiful, responsive design with accessibility features
- **Real-time Processing**: Generates reports with loading states and error handling

## Form Fields

The application collects the following information:

### Required Fields
- **Legal Matter**: Detailed description of the legal issue
- **Location**: City, state/province, country
- **Legal Type**: Employment, Family, Housing, Immigration, Criminal, Civil Rights, Consumer Protection, Disability Rights, Elder Law, or Other

### Optional Fields
- **Employment Status**: Employed, Unemployed, Self-Employed, Student, Retired, Disabled
- **Income Level**: Low Income, Moderate Income, Middle Income, High Income
- **Demographics**: 
  - Member of First Nation/Indigenous Community
  - Veteran
  - Senior Citizen (65+)
  - Person with Disability
- **Urgency Level**: Low, Medium, High

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd legal-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   NODE_ENV=development
   ```
   
   **To get an OpenAI API key:**
   1. Go to [OpenAI Platform](https://platform.openai.com/)
   2. Sign up or log in to your account
   3. Navigate to API Keys section
   4. Create a new API key
   5. Copy the key and paste it in your `.env` file

4. **Start the application**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

1. **Fill out the form** with your legal matter details
2. **Click "Get Legal Assistance Report"** to generate your personalized report
3. **Review the report** which includes:
   - Legal analysis of your situation
   - Relevant laws and regulations
   - Recommended actions
   - Available resources and assistance programs
   - Next steps based on urgency
   - Important warnings and considerations

## API Endpoints

### POST /api/generate-report
Generates a legal assistance report based on form data.

**Request Body:**
```json
{
  "formData": {
    "legalMatter": "Description of legal issue",
    "location": "City, State, Country",
    "legalType": "employment",
    "employmentStatus": "employed",
    "incomeLevel": "low-income",
    "firstNation": true,
    "veteran": false,
    "senior": false,
    "disability": false,
    "urgency": "medium"
  }
}
```

**Response:**
```json
{
  "success": true,
  "report": "HTML formatted legal assistance report"
}
```

### GET /api/health
Health check endpoint.

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **AI Integration**: OpenAI GPT-3.5-turbo
- **Styling**: Custom CSS with modern design principles
- **Icons**: CSS-based icons and animations

## Legal Disclaimer

This application provides general legal information only and does not constitute professional legal advice. Users should consult with qualified attorneys for specific legal matters. The information provided is for educational and informational purposes only.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support or questions, please open an issue in the repository or contact the development team.

## Roadmap

- [ ] Multi-language support
- [ ] Integration with legal aid databases
- [ ] Document generation capabilities
- [ ] Appointment scheduling with legal professionals
- [ ] Mobile app version
- [ ] Advanced AI models for more specific legal guidance