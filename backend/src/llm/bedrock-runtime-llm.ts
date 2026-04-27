import { BedrockRuntimeClient, ConverseCommand, type ContentBlock } from '@aws-sdk/client-bedrock-runtime';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { LLM } from '@langchain/core/language_models/llms';

export interface BedrockRuntimeLlmInput {
  modelId: string;
  region?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export class BedrockRuntimeLlm extends LLM {
  private readonly client: BedrockRuntimeClient;
  private readonly config: BedrockRuntimeLlmInput;

  constructor(config: BedrockRuntimeLlmInput) {
    super({});
    this.config = config;
    this.client = new BedrockRuntimeClient(config.region ? { region: config.region } : {});
  }

  _llmType(): string {
    return 'aws-bedrock-runtime';
  }

  _identifyingParams() {
    return {
      modelId: this.config.modelId,
      region: this.config.region,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      topP: this.config.topP,
    };
  }

  async _call(
    prompt: string,
    _options: this['ParsedCallOptions'],
    _runManager?: CallbackManagerForLLMRun,
  ): Promise<string> {
    const response = await this.client.send(
      new ConverseCommand({
        modelId: this.config.modelId,
        messages: [
          {
            role: 'user',
            content: [{ text: prompt }],
          },
        ],
        inferenceConfig: {
          temperature: this.config.temperature ?? 0.7,
          maxTokens: this.config.maxTokens ?? 4096,
          topP: this.config.topP ?? 0.9,
        },
      }),
    );

    const text = this.extractTextContent(response.output?.message?.content ?? []);
    if (!text) {
      throw new Error(
        `Bedrock response did not contain text content${response.stopReason ? ` (stopReason: ${response.stopReason})` : ''}.`,
      );
    }

    return text;
  }

  private extractTextContent(blocks: ContentBlock[]): string {
    return blocks
      .map((block) => ('text' in block && typeof block.text === 'string' ? block.text : ''))
      .join('');
  }
}