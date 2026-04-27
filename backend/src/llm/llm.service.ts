import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { BedrockRuntimeLlm } from './bedrock-runtime-llm';
import { LocalLlama } from './local-llama';

const DEFAULT_BEDROCK_MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_LOCAL_MODEL_PATH = './models/llama-3-8b-instruct.Q4_K_M.gguf';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_TOP_P = 0.9;
const DEFAULT_MAX_TOKENS = 4096;

type LlmProvider = 'bedrock' | 'deepseek' | 'openai' | 'local';

function extractJson(raw: string): string {
  const start = raw.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in LLM response');

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }

  if (depth > 0) {
    let truncated = raw.slice(start).trimEnd();
    truncated = truncated.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, '');
    truncated += '}'.repeat(depth);
    return truncated;
  }

  throw new Error('Incomplete JSON object in LLM response');
}

function repairJson(raw: string): string {
  let s = raw;
  s = s.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  s = s.replace(/,\s*([}\]])/g, '$1');
  s = s.replace(/"([^"]*?)"/gs, (_m, content: string) =>
    '"' + content.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"',
  );
  return s;
}

function parseJsonRobust<T>(raw: string): T {
  const extracted = extractJson(raw);
  try {
    return JSON.parse(extracted) as T;
  } catch {
    try {
      return JSON.parse(repairJson(extracted)) as T;
    } catch {
      const repaired = repairJson(raw);
      return JSON.parse(extractJson(repaired)) as T;
    }
  }
}

function extractTextSegment(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';

  if ('text' in value) {
    const text = (value as { text?: unknown }).text;
    if (typeof text === 'string') return text;
    if (text && typeof text === 'object') {
      const nestedValue = (text as { value?: unknown }).value;
      if (typeof nestedValue === 'string') return nestedValue;
    }
  }

  if ('content' in value) {
    const content = (value as { content?: unknown }).content;
    if (typeof content === 'string') return content;
  }

  return '';
}

function normalizeModelOutput(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (!raw || typeof raw !== 'object') return String(raw);

  if ('content' in raw) {
    const content = (raw as { content?: unknown }).content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      const text = content.map((item) => extractTextSegment(item)).join('');
      if (text) return text;
    }
  }

  return String(raw);
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private llmModel: BaseLanguageModel | null = null;
  private activeProvider: LlmProvider | null = null;
  private initialized = false;

  constructor(private config: ConfigService) {}

  private async initializeLLM(): Promise<void> {
    if (this.initialized) return;

    const preferredProvider = this.getPreferredProvider();
    const initErrors: string[] = [];

    for (const provider of this.getProviderOrder(preferredProvider)) {
      try {
        const model = await this.initializeProvider(provider, preferredProvider === provider);
        if (!model) continue;

        this.llmModel = model;
        this.activeProvider = provider;
        this.initialized = true;
        return;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        initErrors.push(`${provider}: ${errorMsg}`);

        if (preferredProvider === provider) {
          throw err;
        }

        this.logger.warn(`Skipping ${provider} provider during LLM initialization: ${errorMsg}`);
      }
    }

    throw new Error(
      `No LLM available. Configure AWS Bedrock, DeepSeek, OpenAI, or ensure the GGUF model exists at ${this.config.get<string>('LOCAL_MODEL_PATH', DEFAULT_LOCAL_MODEL_PATH)}.${initErrors.length ? ` Initialization errors: ${initErrors.join(' | ')}` : ''}`,
    );
  }

  private getPreferredProvider(): LlmProvider | null {
    const provider = this.config.get<string>('LLM_PROVIDER')?.trim().toLowerCase();
    if (!provider || provider === 'auto') return null;

    if (provider === 'bedrock' || provider === 'deepseek' || provider === 'openai' || provider === 'local') {
      return provider;
    }

    throw new Error(`Unsupported LLM_PROVIDER "${provider}". Use bedrock, deepseek, openai, local, or auto.`);
  }

  private getProviderOrder(preferredProvider: LlmProvider | null): LlmProvider[] {
    if (preferredProvider) return [preferredProvider];
    return ['bedrock', 'deepseek', 'openai', 'local'];
  }

  private async initializeProvider(
    provider: LlmProvider,
    isExplicitProvider: boolean,
  ): Promise<BaseLanguageModel | null> {
    switch (provider) {
      case 'bedrock':
        return this.initializeBedrock(isExplicitProvider);
      case 'deepseek':
        return this.initializeDeepSeek(isExplicitProvider);
      case 'openai':
        return this.initializeOpenAi(isExplicitProvider);
      case 'local':
        return this.initializeLocalLlama();
      default:
        return null;
    }
  }

  private initializeBedrock(isExplicitProvider: boolean): BaseLanguageModel | null {
    if (!isExplicitProvider && !this.hasBedrockConfigHints()) {
      return null;
    }

    const explicitModel = this.config.get<string>('BEDROCK_MODEL_ID')?.trim();
    const sharedModel = isExplicitProvider ? this.config.get<string>('LLM_MODEL')?.trim() : undefined;
    const modelId = explicitModel || sharedModel || DEFAULT_BEDROCK_MODEL_ID;
    const region = this.getBedrockRegion();

    this.logger.log(`Using AWS Bedrock${region ? ` (${region})` : ''} (model: ${modelId})`);
    return new BedrockRuntimeLlm({
      modelId,
      region,
      temperature: DEFAULT_TEMPERATURE,
      topP: DEFAULT_TOP_P,
      maxTokens: DEFAULT_MAX_TOKENS,
    });
  }

  private initializeDeepSeek(isExplicitProvider: boolean): BaseLanguageModel | null {
    const deepSeekKey = this.config.get<string>('DEEPSEEK_API_KEY')?.trim();
    if (!this.hasUsableApiKey(deepSeekKey)) {
      if (isExplicitProvider) {
        throw new Error('DEEPSEEK_API_KEY is not configured.');
      }
      return null;
    }

    const model = this.config.get<string>('LLM_MODEL')?.trim() || DEFAULT_DEEPSEEK_MODEL;
    this.logger.log(`Using DeepSeek API (model: ${model})`);
    return new ChatOpenAI({
      openAIApiKey: deepSeekKey,
      modelName: model,
      temperature: DEFAULT_TEMPERATURE,
      configuration: {
        baseURL: 'https://api.deepseek.com/v1',
      },
    });
  }

  private initializeOpenAi(isExplicitProvider: boolean): BaseLanguageModel | null {
    const openAiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!this.hasUsableApiKey(openAiKey)) {
      if (isExplicitProvider) {
        throw new Error('OPENAI_API_KEY is not configured.');
      }
      return null;
    }

    const model = this.config.get<string>('LLM_MODEL')?.trim() || DEFAULT_OPENAI_MODEL;
    this.logger.log(`Using OpenAI direct (model: ${model})`);
    return new ChatOpenAI({
      openAIApiKey: openAiKey,
      modelName: model,
      temperature: DEFAULT_TEMPERATURE,
    });
  }

  private async initializeLocalLlama(): Promise<BaseLanguageModel> {
    const modelPath = this.config.get<string>('LOCAL_MODEL_PATH', DEFAULT_LOCAL_MODEL_PATH);
    this.logger.log(`Loading local Llama model from ${modelPath}`);

    try {
      const model = await LocalLlama.initialize({
        modelPath,
        threads: 8,
        temperature: DEFAULT_TEMPERATURE,
        topP: DEFAULT_TOP_P,
        topK: 40,
        maxTokens: DEFAULT_MAX_TOKENS,
      });
      this.logger.log('✓ Local Llama model initialized successfully');
      return model;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to initialize local Llama model: ${errorMsg}`);
      throw new Error(`Failed to initialize local Llama model: ${errorMsg}`);
    }
  }

  private getBedrockRegion(): string | undefined {
    return (
      this.config.get<string>('BEDROCK_AWS_REGION')?.trim() ||
      this.config.get<string>('AWS_REGION')?.trim() ||
      this.config.get<string>('AWS_DEFAULT_REGION')?.trim() ||
      undefined
    );
  }

  private hasBedrockConfigHints(): boolean {
    const hints = [
      this.config.get<string>('BEDROCK_MODEL_ID'),
      this.config.get<string>('BEDROCK_AWS_REGION'),
      this.config.get<string>('AWS_REGION'),
      this.config.get<string>('AWS_DEFAULT_REGION'),
      this.config.get<string>('AWS_ACCESS_KEY_ID'),
      this.config.get<string>('AWS_PROFILE'),
      this.config.get<string>('AWS_WEB_IDENTITY_TOKEN_FILE'),
      this.config.get<string>('AWS_ROLE_ARN'),
      this.config.get<string>('AWS_CONTAINER_CREDENTIALS_RELATIVE_URI'),
      this.config.get<string>('AWS_CONTAINER_CREDENTIALS_FULL_URI'),
    ];

    return hints.some((value) => Boolean(value?.trim()));
  }

  private hasUsableApiKey(value?: string): boolean {
    return Boolean(value && value !== 'sk-your-key-here');
  }

  async generateJson<T extends Record<string, unknown> = Record<string, unknown>>(prompt: string): Promise<T> {
    if (!this.initialized) await this.initializeLLM();
    if (!this.llmModel) throw new Error('LLM model not initialized.');

    const promptTemplate = PromptTemplate.fromTemplate(
      `You are an expert Amazon marketplace consultant. Always respond with ONLY valid JSON, no markdown code blocks, no explanations, no additional text.

{prompt}

Respond ONLY with valid JSON:`,
    );

    const chain = promptTemplate.pipe(this.llmModel);
    const maxAttempts = this.activeProvider === 'local' ? 2 : 1;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const raw = await chain.invoke({ prompt });
        const rawStr = normalizeModelOutput(raw);
        this.logger.debug(
          `${this.activeProvider ?? 'llm'} raw attempt ${attempt} (first 500 chars): ${rawStr.slice(0, 500)}`,
        );
        return parseJsonRobust<T>(rawStr);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(
          `${this.activeProvider ?? 'llm'} generation attempt ${attempt}/${maxAttempts} failed: ${lastError.message}`,
        );
      }
    }

    this.logger.error(
      `LLM generation failed${this.activeProvider ? ` for ${this.activeProvider}` : ''} after ${maxAttempts} attempts: ${lastError?.message}`,
    );
    throw new Error(`Failed to generate JSON from ${this.activeProvider ?? 'LLM'}: ${lastError?.message}`);
  }
}
