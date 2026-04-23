import { LLM } from '@langchain/core/language_models/llms';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';

// Bypasses TypeScript's CJS transpilation that converts import() → require()
const dynamicImport = new Function('modulePath', 'return import(modulePath)') as (
  m: string,
) => Promise<any>;

export interface LocalLlamaInput {
  modelPath: string;
  threads?: number;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

/**
 * LangChain-compatible LLM adapter for local GGUF models via node-llama-cpp v3.
 *
 * Uses node-llama-cpp v3's sequence architecture for proper KV cache management:
 *   getLlama() → loadModel() → createContext() → getSequence() → LlamaChatSession
 *
 * Each call creates a fresh session, then erases the sequence's KV cache via
 * clearHistory(), so every prompt gets the full context window.
 */
export class LocalLlama extends LLM {
  private context: any;
  private nodeLlamaCpp: any;
  private config: LocalLlamaInput;

  _llmType(): string {
    return 'local-llama-cpp';
  }

  private constructor(config: LocalLlamaInput, context: any, nodeLlamaCpp: any) {
    super({});
    this.config = config;
    this.context = context;
    this.nodeLlamaCpp = nodeLlamaCpp;
  }

  static async initialize(input: LocalLlamaInput): Promise<LocalLlama> {
    const nodeLlamaCpp = await dynamicImport('node-llama-cpp');
    const llama = await nodeLlamaCpp.getLlama();
    const model = await llama.loadModel({ modelPath: input.modelPath });
    const context = await model.createContext({ contextSize: 8192 });
    return new LocalLlama(input, context, nodeLlamaCpp);
  }

  async _call(
    prompt: string,
    _options: this['ParsedCallOptions'],
    _runManager?: CallbackManagerForLLMRun,
  ): Promise<string> {
    const sequence = this.context.getSequence();
    const session = new this.nodeLlamaCpp.LlamaChatSession({
      contextSequence: sequence,
    });
    try {
      return await session.prompt(prompt, {
        temperature: this.config.temperature ?? 0.7,
        maxTokens: this.config.maxTokens ?? 4096,
        topP: this.config.topP ?? 0.9,
        topK: this.config.topK ?? 40,
      });
    } finally {
      // Dispose session + sequence to free KV cache slots for next call
      session.dispose({ disposeSequence: true });
    }
  }
}
