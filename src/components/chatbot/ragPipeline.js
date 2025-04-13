import { GoogleGenerativeAI } from '@google/generative-ai';

class BaseRAGPipeline {
    constructor() {
        this.documents = [];
    }

    async loadDocuments() {
        // In a real implementation, this would fetch documents from an API endpoint
        // For now, we'll use a hardcoded knowledge base
        const knowledgeBase = [
            "The ticketing system allows users to create, view, and manage support tickets.",
            "Users can be assigned one of three roles: admin, helpdesk, or regular user.",
            "Admins have full access to all features and can manage users and tickets.",
            "Helpdesk agents can view and respond to tickets but cannot manage users.",
            "Regular users can create tickets and view their own tickets.",
            "Tickets can have different statuses: open, in progress, resolved, and closed.",
            "Each ticket has a title, description, priority level, and assigned agent.",
            "Users can add comments to tickets to provide updates or additional information.",
            "The system supports file attachments for tickets and comments.",
            "Email notifications are sent for important ticket updates and status changes."
        ];

        this.documents = knowledgeBase;
        return knowledgeBase;
    }

    async getRelevantContext(question) {
        if (this.documents.length === 0) {
            await this.loadDocuments();
        }
        // For now, return all documents as context
        return this.documents.join('\n');
    }

    async query(question) {
        throw new Error('query method must be implemented by subclass');
    }
}

class OpenAIRAGPipeline extends BaseRAGPipeline {
    constructor() {
        super();
        throw new Error('OpenAI pipeline is not available');
    }
}

class GeminiBasePipeline extends BaseRAGPipeline {
    constructor() {
        super();
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error('Google API key not found');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async query(question) {
        try {
            const context = await this.getRelevantContext(question);

            const prompt = `You are a helpful assistant for a ticketing system. Based on the following context, please answer the question. If the answer cannot be found in the context, say "I'm sorry, I don't have enough information to answer that question."

Context:
${context}

Question: ${question}

Answer:`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Gemini Base Pipeline Error:', error);
            throw error;
        }
    }
}

class GeminiProPipeline extends BaseRAGPipeline {
    constructor() {
        super();
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error('Google API key not found');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    }

    async query(question) {
        try {
            const context = await this.getRelevantContext(question);

            const prompt = `You are a helpful assistant for a ticketing system. Based on the following context, please answer the question. If the answer cannot be found in the context, say "I'm sorry, I don't have enough information to answer that question."

Context:
${context}

Question: ${question}

Answer:`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Gemini Pro Pipeline Error:', error);
            throw error;
        }
    }
}

class RAGPipelineFactory {
    static createPipeline(type = 'gemini-base') {
        switch (type.toLowerCase()) {
            case 'openai':
                return new OpenAIRAGPipeline();
            case 'gemini-pro':
                return new GeminiProPipeline();
            case 'gemini-base':
            default:
                return new GeminiBasePipeline();
        }
    }
}

export default RAGPipelineFactory; 