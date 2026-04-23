import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { LocalLlama } from './local-llama';

/** Extract the first complete JSON object from a string that may have trailing text */
function extractJson(raw: string): string {
  const start = raw.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in LLM response');
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return raw.slice(start, i + 1); }
  }
  // If we're still tracking an unclosed object, close it optimistically
  if (depth > 0) {
    let truncated = raw.slice(start).trimEnd();
    // Remove trailing incomplete key/value
    truncated = truncated.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, '');
    truncated += '}'.repeat(depth);
    return truncated;
  }
  throw new Error('Incomplete JSON object in LLM response');
}

/** Attempt common JSON repairs for sloppy LLM output */
function repairJson(raw: string): string {
  let s = raw;
  // Strip markdown code fences
  s = s.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, '$1');
  // Replace newlines inside string values with \\n
  s = s.replace(/"([^"]*?)"/gs, (_m, content: string) =>
    '"' + content.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"',
  );
  return s;
}

/** Parse JSON with progressive repair attempts */
function parseJsonRobust<T>(raw: string): T {
  // 1. Try extracting and parsing directly
  const extracted = extractJson(raw);
  try {
    return JSON.parse(extracted) as T;
  } catch {
    // 2. Try repair on extracted string
    try {
      return JSON.parse(repairJson(extracted)) as T;
    } catch {
      // 3. Try repair on full raw string, then extract
      const repaired = repairJson(raw);
      return JSON.parse(extractJson(repaired)) as T;
    }
  }
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private llmModel: BaseLanguageModel | null = null;
  private initialized = false;

  constructor(private config: ConfigService) {}

  private async initializeLLM(): Promise<void> {
    if (this.initialized) return;

    const deepSeekKey = this.config.get<string>('DEEPSEEK_API_KEY');
    const openAiKey = this.config.get<string>('OPENAI_API_KEY');
    const model = this.config.get<string>('LLM_MODEL');

    if (deepSeekKey && deepSeekKey !== 'sk-your-key-here') {
      if (!model) throw new Error('LLM_MODEL must be set when using DeepSeek (e.g. deepseek-chat)');
      this.logger.log(`Using DeepSeek API (model: ${model})`);
      this.llmModel = new ChatOpenAI({
        openAIApiKey: deepSeekKey,
        modelName: model,
        temperature: 0.7,
        configuration: {
          baseURL: 'https://api.deepseek.com/v1',
        },
      });
    } else if (openAiKey && openAiKey !== 'sk-your-key-here') {
      if (!model) throw new Error('LLM_MODEL must be set when using OpenAI (e.g. gpt-4o-mini)');
      this.logger.log(`Using OpenAI direct (model: ${model})`);
      this.llmModel = new ChatOpenAI({
        openAIApiKey: openAiKey,
        modelName: model,
        temperature: 0.7,
      });
    } else {
      // Local GGUF model
      const modelPath = this.config.get<string>(
        'LOCAL_MODEL_PATH',
        './models/llama-3-8b-instruct.Q4_K_M.gguf',
      );
      this.logger.log(`Loading local Llama model from ${modelPath}`);

      try {
        this.llmModel = await LocalLlama.initialize({
          modelPath,
          threads: 8,
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxTokens: 4096,
        });
        this.logger.log('✓ Local Llama model initialized successfully');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to initialize local Llama model: ${errorMsg}`);
        throw new Error(
          `No LLM available. Set DEEPSEEK_API_KEY, OPENAI_API_KEY, or ensure the GGUF model exists at ${modelPath}`,
        );
      }
    }

    this.initialized = true;
  }

  async generateJson<T extends Record<string, unknown> = Record<string, unknown>>(prompt: string): Promise<T> {
    if (!this.initialized) await this.initializeLLM();
    if (!this.llmModel) throw new Error('LLM model not initialized.');

    const promptTemplate = PromptTemplate.fromTemplate(
      `You are an expert Amazon marketplace consultant. Always respond with ONLY valid JSON, no markdown code blocks, no explanations, no additional text.

{prompt}

Respond ONLY with valid JSON:`,
    );

    // OpenAI returns clean JSON — use LangChain parser directly
    if (!(this.llmModel instanceof LocalLlama)) {
      const parser = new JsonOutputParser<T>();
      const chain = promptTemplate.pipe(this.llmModel).pipe(parser);
      return (await chain.invoke({ prompt })) as T;
    }

    // Local model: extract JSON with repair + retry
    const chain = promptTemplate.pipe(this.llmModel);
    const maxAttempts = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const raw = await chain.invoke({ prompt });
        const rawStr = typeof raw === 'string' ? raw : String(raw);
        this.logger.debug(`Local LLM raw attempt ${attempt} (first 500 chars): ${rawStr.slice(0, 500)}`);
        return parseJsonRobust<T>(rawStr);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(`Local LLM JSON parse failed (attempt ${attempt}/${maxAttempts}): ${lastError.message}`);
      }
    }

    this.logger.error(`LLM generation failed after ${maxAttempts} attempts: ${lastError?.message}`);
    throw new Error(`Failed to generate JSON from LLM: ${lastError?.message}`);
  }
}
