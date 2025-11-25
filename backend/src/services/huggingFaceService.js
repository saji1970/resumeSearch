const axios = require('axios');

/**
 * Hugging Face Inference API service for conversational AI
 */
class HuggingFaceService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.baseUrl = 'https://api-inference.huggingface.co/models';
    
    // Use a conversational model - you can change this to any model from Hugging Face
    // Popular options: 
    // - microsoft/DialoGPT-medium (faster, more reliable)
    // - facebook/blenderbot-400M-distill (good for conversations)
    // - microsoft/DialoGPT-large (slower, may need loading time)
    // Note: Large models may take 20-30 seconds to load on first request
    this.conversationModel = process.env.HF_CONVERSATION_MODEL || 'microsoft/DialoGPT-medium';
  }

  /**
   * Generate conversational response using Hugging Face
   */
  async chat(message, conversationHistory = []) {
    try {
      if (!this.apiKey || this.apiKey === 'your-huggingface-api-key') {
        throw new Error('HUGGINGFACE_API_KEY not configured');
      }

      // Use a more reliable conversational model
      // DialoGPT models may need to be loaded first, so use a faster alternative
      const model = 'microsoft/DialoGPT-medium'; // Medium is faster and more reliable
      
      // Build conversation context - simpler format for DialoGPT
      let prompt = message;
      if (conversationHistory.length > 0) {
        // DialoGPT works better with simple context
        const lastUserMessage = conversationHistory.filter(m => m.role === 'user').slice(-1)[0];
        if (lastUserMessage) {
          prompt = `${lastUserMessage.content} ${message}`;
        }
      }

      console.log('Hugging Face request:', { model, promptLength: prompt.length });

      const response = await axios.post(
        `${this.baseUrl}/${model}`,
        {
          inputs: prompt,
          parameters: {
            max_new_tokens: 150,
            temperature: 0.9,
            return_full_text: false,
            do_sample: true
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000 // 20 second timeout
        }
      );

      console.log('Hugging Face response:', response.status, response.data?.length || 0);

      // Handle different response formats
      let generatedText = '';
      if (Array.isArray(response.data) && response.data[0]) {
        generatedText = response.data[0].generated_text || response.data[0].text || '';
      } else if (response.data?.generated_text) {
        generatedText = response.data.generated_text;
      } else if (typeof response.data === 'string') {
        generatedText = response.data;
      }
      
      // Clean up the response - remove the original prompt if included
      if (generatedText.includes(prompt)) {
        generatedText = generatedText.replace(prompt, '').trim();
      }
      
      // Remove any remaining prompt artifacts
      generatedText = generatedText
        .replace(/^User:.*$/gm, '')
        .replace(/^Assistant:.*$/gm, '')
        .trim();
      
      if (!generatedText || generatedText.length < 5) {
        throw new Error('Empty or invalid response from Hugging Face');
      }
      
      return generatedText;
    } catch (error) {
      console.error('Hugging Face API error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        model: this.conversationModel
      });
      
      // Check for specific error types
      if (error.response?.status === 503) {
        console.error('Model is loading. This can take 20-30 seconds on first request.');
        throw new Error('Model is loading. Please try again in a moment.');
      }
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('Authentication error - check API key');
        throw new Error('Hugging Face authentication failed. Check your API key.');
      }
      
      // Re-throw to let the caller handle fallback
      throw error;
    }
  }

  /**
   * Use a text generation model for more complex reasoning
   */
  async generateText(prompt, maxTokens = 200) {
    try {
      if (!this.apiKey) {
        throw new Error('HUGGINGFACE_API_KEY not configured');
      }

      // Use a text generation model
      const model = process.env.HF_TEXT_MODEL || 'gpt2'; // You can use better models
      
      const response = await axios.post(
        `${this.baseUrl}/${model}`,
        {
          inputs: prompt,
          parameters: {
            max_new_tokens: maxTokens,
            temperature: 0.7,
            return_full_text: false
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data[0]?.generated_text?.trim() || '';
    } catch (error) {
      console.error('Hugging Face text generation error:', error.response?.data || error.message);
      return '';
    }
  }

  /**
   * Analyze CV content and generate relevant questions
   */
  async analyzeCVAndGenerateQuestions(cvData) {
    try {
      const prompt = `Based on this CV/resume information, generate 3-5 relevant questions to understand the candidate's job requirements and preferences better.

CV Summary:
- Name: ${cvData.name || 'Not provided'}
- Experience: ${JSON.stringify(cvData.experience || [])}
- Skills: ${JSON.stringify(cvData.skills || {})}
- Education: ${JSON.stringify(cvData.education || [])}

Generate questions that help understand:
1. What type of job they're looking for
2. Their preferred work location/remote preferences
3. Salary expectations
4. Career goals
5. Specific skills they want to use

Format as a numbered list of questions.`;

      const questions = await this.generateText(prompt, 300);
      
      // Parse questions from the response
      const questionList = questions
        .split('\n')
        .filter(line => line.match(/^\d+[\.\)]/) || line.trim().startsWith('-'))
        .map(q => q.replace(/^\d+[\.\)]\s*/, '').replace(/^-\s*/, '').trim())
        .filter(q => q.length > 10);

      return questionList.length > 0 
        ? questionList.slice(0, 5)
        : [
            "What type of job are you looking for?",
            "What's your preferred work location or remote work preference?",
            "What are your salary expectations?",
            "What are your main career goals?",
            "Which skills do you want to use in your next role?"
          ];
    } catch (error) {
      console.error('Error generating CV questions:', error);
      return [
        "What type of job are you looking for?",
        "What's your preferred work location?",
        "What are your salary expectations?"
      ];
    }
  }
}

module.exports = new HuggingFaceService();

