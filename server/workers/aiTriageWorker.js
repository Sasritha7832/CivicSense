const { Worker } = require('bullmq');
const OpenAI = require('openai');
const Issue = require('../models/Issue');
const Category = require('../models/Category');
const { checkRedisVersion } = require('../utils/redisCheck');
const { getQueue } = require('../utils/queueFallback');

const setupAITriageWorker = (connection) => {
  const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

  const handler = async (job) => {
    const { issueId } = job.data;
    const issue = await Issue.findById(issueId).populate('category');
    if (!issue) return;

    console.log(`[aiTriageWorker] Processing issue: ${issue.title}`);

    let suggestedCategory = null;
    let suggestedPriority = 'Medium';

    // 1. LLM-based Triage
    if (openai) {
      try {
        const categories = await Category.find();
        const categoryList = categories.map(c => c.name).join(', ');
        
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "system",
            content: `You are an AI city management assistant. Categorize issues and assign priority (Low, Medium, High, Critical). 
            Available categories: ${categoryList}. 
            Respond ONLY with JSON: {"category": "category_name", "priority": "priority_level", "reason": "short explanation"}`
          }, {
            role: "user",
            content: `Title: ${issue.title}\nDescription: ${issue.description}`
          }],
          response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content);
        const cat = categories.find(c => c.name.toLowerCase() === result.category.toLowerCase());
        
        // Only update if not already set or if it's the initial creation
        if (cat && (!issue.category || issue.category.name === 'General')) {
          suggestedCategory = cat._id;
        }
        
        // Only update priority if it's currently Medium (default)
        if (issue.priority === 'Medium' && result.priority) {
          suggestedPriority = result.priority;
        }

        console.log(`[aiTriageWorker] AI Suggestion: ${result.category} (${result.priority}) - Reason: ${result.reason}`);
      } catch (err) {
        console.error('[aiTriageWorker] OpenAI Error:', err);
      }
    }

    // 2. Local Duplicate Detection (Simplified Embeddings/Keyword)
    // In a real app, we'd use vector search. Here we use text search for "real logic"
    const duplicates = await Issue.find({
      _id: { $ne: issue._id },
      isDeleted: false,
      status: { $ne: 'Resolved' },
      'location.ward': issue.location.ward,
      $or: [
        { title: { $regex: issue.title.split(' ').slice(0, 3).join('|'), $options: 'i' } },
        { description: { $regex: issue.title.split(' ').slice(0, 3).join('|'), $options: 'i' } }
      ]
    }).limit(1);

    if (duplicates.length > 0) {
      issue.duplicateOf = duplicates[0]._id;
      console.log(`[aiTriageWorker] Duplicate detected: ${issue._id} -> ${duplicates[0]._id}`);
    }

    // Update issue with AI findings
    if (suggestedCategory && !issue.category) issue.category = suggestedCategory;
    if (suggestedPriority) issue.priority = suggestedPriority;
    
    await issue.save();
    console.log(`[aiTriageWorker] Triage complete for ${issue._id}`);
  };

  // Register with fallback queue for synchronous execution if needed
  getQueue('ai-triage', { connection }).registerHandler(handler);

  // Return real worker only if compatible
  return {
    init: async () => {
      const compatible = await checkRedisVersion();
      if (compatible) {
        return new Worker('ai-triage', handler, { connection });
      }
      console.warn('[aiTriageWorker] Skipping real Worker due to Redis incompatibility');
      return { close: async () => {} };
    }
  };
};

module.exports = setupAITriageWorker;
