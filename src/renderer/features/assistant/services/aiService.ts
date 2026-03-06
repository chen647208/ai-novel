import { GoogleGenAI } from "@google/genai";
import { ModelConfig, AIResponse, StreamingCallback, AIHistoryRecord } from "../../../../shared/types";

export class AIService {
  // 辅助函数：构建AI历史记录所需的数据
  static buildHistoryRecordData(
    chapterId: string,
    prompt: string,
    generatedContent: string,
    model: ModelConfig,
    response: AIResponse,
    metadata?: { templateName?: string; batchGeneration?: boolean; chapterTitle?: string; generatedChapterCount?: number; operationType?: string }
  ): AIHistoryRecord {
    return {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chapterId,
      timestamp: Date.now(),
      prompt,
      generatedContent,
      modelConfig: {
        modelName: model.modelName,
        provider: model.provider,
        temperature: model.temperature,
        maxTokens: model.maxTokens
      },
      tokens: response.tokens,
      metadata
    };
  }

  static async call(model: ModelConfig, prompt: string): Promise<AIResponse> {
    if (!model) {
      return {
        content: "",
        error: "未配置有效的 AI 模型。"
      };
    }

    const processResponse = (text: string) => {
      // 去除可能的 JSON 包装（某些中间件会错误包装）
      let clean = text.trim();
      if (clean.startsWith('```json')) {
        const match = clean.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) clean = match[1];
      } else if (clean.startsWith('```')) {
        const match = clean.match(/```[a-zA-Z]*\s*([\s\S]*?)\s*```/);
        if (match) clean = match[1];
      }
      return clean;
    };

    // 构建消息数组，支持系统提示词
    const buildMessages = (systemPrompt?: string, userPrompt: string = prompt) => {
      const messages: Array<{ role: string; content: string }> = [];
      
      // 如果有系统提示词，添加为系统角色消息
      if (systemPrompt && systemPrompt.trim().length > 0) {
        messages.push({ role: 'system', content: systemPrompt.trim() });
      }
      
      // 添加用户消息
      messages.push({ role: 'user', content: userPrompt });
      
      return messages;
    };

    // 提取Token信息的辅助函数
    const extractTokenInfo = (data: any, provider: string): { prompt: number; completion: number; total: number } | undefined => {
      if (!data) return undefined;
      
      switch (provider) {
        case 'gemini':
          // Gemini API 返回格式
          if (data.usage) {
            return {
              prompt: data.usage.prompt_tokens || 0,
              completion: data.usage.completion_tokens || 0,
              total: data.usage.total_tokens || 0
            };
          }
          break;
          
        case 'ollama':
        case 'openai-compatible':
          // OpenAI兼容格式
          if (data.usage) {
            return {
              prompt: data.usage.prompt_tokens || 0,
              completion: data.usage.completion_tokens || 0,
              total: data.usage.total_tokens || 0
            };
          }
          break;
      }
      
      return undefined;
    };

    // 情况 A: Gemini 提供商
    if (model.provider === 'gemini') {
      const apiKey = model.apiKey;
      if (!apiKey) {
        return {
          content: "",
          error: "Gemini API Key 未配置。"
        };
      }

      // 检查是否使用OpenAI兼容端点（方案A：统一OpenAI兼容模式）
      const isOpenAICompatibleEndpoint = model.endpoint?.includes('/v1beta/openai/');
      
      if (isOpenAICompatibleEndpoint) {
        // 使用OpenAI兼容模式（统一处理）
        try {
          const baseUrl = model.endpoint!.replace(/\/+$/, '');
          const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
          
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
            },
            body: JSON.stringify({
              model: model.modelName,
              messages: buildMessages(model.systemPrompt),
              temperature: model.temperature ?? 0.7,
              max_tokens: model.maxTokens,
              stream: false
            })
          });
          
          if (!res.ok) {
            const errText = await res.text();
            let msg = res.statusText;
            try {
              const errJson = JSON.parse(errText);
              msg = errJson.error?.message || errJson.message || msg;
            } catch(e) {}
            return {
              content: "",
              error: `Gemini OpenAI兼容接口请求失败 (${res.status}): ${msg}`
            };
          }

          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          const tokens = extractTokenInfo(data, 'gemini');
          
          return {
            content: processResponse(content || ""),
            tokens,
            model: data.model || model.modelName,
            finishReason: data.choices?.[0]?.finish_reason,
            metadata: {
              prompt,
              modelConfig: model
            }
          };
        } catch (error: any) {
          return {
            content: "",
            error: `Gemini OpenAI兼容接口网络异常: ${error.message}`
          };
        }
      }
      // 使用自定义端点（原生Gemini API）
      else if (model.endpoint && model.endpoint.trim().length > 0) {
        try {
          const baseUrl = model.endpoint.replace(/\/+$/, '');
          const url = `${baseUrl}/models/${model.modelName}:generateContent?key=${apiKey}`;
          
          // 构建请求体，支持系统提示词（通过system_instruction字段）
          const requestBody: any = {
            contents: [{ parts: [{ text: prompt }] }]
          };
          
          // 添加系统提示词（如果提供）
          if (model.systemPrompt && model.systemPrompt.trim().length > 0) {
            requestBody.system_instruction = { parts: [{ text: model.systemPrompt.trim() }] };
          }
          
          // 添加生成配置（温度和最大令牌数）
          const generationConfig: any = {};
          if (model.temperature !== undefined) {
            generationConfig.temperature = model.temperature;
          }
          if (model.maxTokens !== undefined) {
            generationConfig.maxOutputTokens = model.maxTokens;
          }
          
          if (Object.keys(generationConfig).length > 0) {
            requestBody.generationConfig = generationConfig;
          }
          
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          
          if (!res.ok) {
            const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
            return {
              content: "",
              error: `Gemini代理请求失败 (${res.status}): ${error.error?.message || '未知错误'}`
            };
          }
          
          const data = await res.json();
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          
          // 提取原生Gemini API的token信息
          let tokens;
          if (data.usageMetadata) {
            tokens = {
              prompt: data.usageMetadata.promptTokenCount || 0,
              completion: data.usageMetadata.candidatesTokenCount || 0,
              total: data.usageMetadata.totalTokenCount || 0
            };
          } else {
            // 尝试使用extractTokenInfo作为备选
            tokens = extractTokenInfo(data, 'gemini');
          }
          
          return {
            content: processResponse(content),
            tokens,
            model: model.modelName,
            metadata: {
              prompt,
              modelConfig: model
            }
          };
        } catch (e: any) {
          return {
            content: "",
            error: `Gemini连接异常: ${e.message}`
          };
        }
      }
      // 使用GoogleGenAI SDK（默认方式）
      else {
        const ai = new GoogleGenAI({ apiKey });
        try {
          // 构建请求配置
          const requestConfig: any = {
            model: model.modelName,
            contents: prompt,
          };
          
          // 添加系统提示词（如果提供）
          if (model.systemPrompt && model.systemPrompt.trim().length > 0) {
            requestConfig.systemInstruction = model.systemPrompt.trim();
          }
          
          // 添加生成配置
          const generationConfig: any = {};
          if (model.temperature !== undefined) {
            generationConfig.temperature = model.temperature;
          }
          if (model.maxTokens !== undefined) {
            generationConfig.maxOutputTokens = model.maxTokens;
          }
          
          if (Object.keys(generationConfig).length > 0) {
            requestConfig.generationConfig = generationConfig;
          }
          
          const response = await ai.models.generateContent(requestConfig);
          const content = response.text || "";
          
          // 提取GoogleGenAI SDK的token信息
          let tokens;
          if (response.usageMetadata) {
            tokens = {
              prompt: response.usageMetadata.promptTokenCount || 0,
              completion: response.usageMetadata.candidatesTokenCount || 0,
              total: response.usageMetadata.totalTokenCount || 0
            };
          } else {
            // 尝试从响应中提取其他可能的token信息
            tokens = extractTokenInfo(response, 'gemini');
          }
          
          return {
            content: processResponse(content),
            tokens,
            model: model.modelName,
            metadata: {
              prompt,
              modelConfig: model
            }
          };
        } catch (error: any) {
          return {
            content: "",
            error: `Gemini SDK错误: ${error.message}`
          };
        }
      }
    } 
    
    // 情况 B: Ollama 或 OpenAI 兼容提供商（统一OpenAI兼容模式）
    else {
      const endpoint = model.endpoint || (model.provider === 'ollama' ? 'http://localhost:11434/v1' : '');
      const baseUrl = endpoint.replace(/\/+$/, '');
      const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
      
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(model.apiKey ? { 'Authorization': `Bearer ${model.apiKey}` } : {})
          },
          body: JSON.stringify({
            model: model.modelName,
            messages: buildMessages(model.systemPrompt),
            temperature: model.temperature ?? 0.7,  // 使用配置值，默认0.7
            max_tokens: model.maxTokens,           // 可选，不设置则使用模型默认值
            stream: false
          })
        });
        
        if (!res.ok) {
          const errText = await res.text();
          let msg = res.statusText;
          try {
            const errJson = JSON.parse(errText);
            msg = errJson.error?.message || errJson.message || msg;
          } catch(e) {}
          return {
            content: "",
            error: `接口请求失败 (${res.status}): ${msg}`
          };
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        const tokens = extractTokenInfo(data, model.provider);
        
        return {
          content: processResponse(content || ""),
          tokens,
          model: data.model || model.modelName,
          finishReason: data.choices?.[0]?.finish_reason,
          metadata: {
            prompt,
            modelConfig: model
          }
        };
      } catch (error: any) {
        return {
          content: "",
          error: `网络请求异常: ${error.message}`,
          metadata: {
            prompt,
            modelConfig: model
          }
        };
      }
    }
  }

  static async testConnection(model: ModelConfig): Promise<string> {
    const response = await this.call(model, "你好，请回复'连接成功'。");
    
    if (response.error) {
      return `[ERROR] ${response.error}`;
    }
    
    // 检查响应内容是否包含预期的连接成功消息
    const content = response.content || '';
    if (content.includes("连接成功") || content.includes("success") || content.includes("Success")) {
      return `[SUCCESS] 连接测试成功！\n模型: ${response.model || model.modelName}\n响应: ${content}`;
    } else {
      return `[INFO] 连接正常，但响应内容不符合预期\n模型: ${response.model || model.modelName}\n响应: ${content}`;
    }
  }

  // 流式调用方法
  static async callStreaming(
    model: ModelConfig, 
    prompt: string, 
    onChunk: StreamingCallback
  ): Promise<void> {
    if (!model) {
      onChunk({
        content: "",
        error: "未配置有效的 AI 模型。",
        isComplete: true
      });
      return;
    }

    // 构建消息数组，支持系统提示词
    const buildMessages = (systemPrompt?: string, userPrompt: string = prompt) => {
      const messages: Array<{ role: string; content: string }> = [];
      
      if (systemPrompt && systemPrompt.trim().length > 0) {
        messages.push({ role: 'system', content: systemPrompt.trim() });
      }
      
      messages.push({ role: 'user', content: userPrompt });
      
      return messages;
    };

    // 检查模型是否支持流式输出
    if (model.supportsStreaming === false) {
      // 如果不支持流式，回退到普通调用
      const response = await this.call(model, prompt);
      onChunk({
        ...response,
        isComplete: true,
        isStreaming: false,
        error: response.error || "当前模型配置为不支持流式输出，已自动使用传统输出模式。如需流式输出，请在模型设置中开启'流式输出支持'。"
      });
      return;
    }

    try {
      let endpoint = '';
      let apiKey = '';
      let isOpenAICompatible = false;

      // 配置端点
      if (model.provider === 'gemini') {
        apiKey = model.apiKey || '';
        if (!apiKey) {
          onChunk({
            content: "",
            error: "Gemini API Key 未配置。",
            isComplete: true
          });
          return;
        }

        // 检查是否使用OpenAI兼容端点
        isOpenAICompatible = model.endpoint?.includes('/v1beta/openai/') || false;
        
        if (isOpenAICompatible && model.endpoint) {
          endpoint = model.endpoint.replace(/\/+$/, '');
          if (!endpoint.endsWith('/chat/completions')) {
            endpoint = `${endpoint}/chat/completions`;
          }
        } else if (model.endpoint && model.endpoint.trim().length > 0) {
          // 原生Gemini API不支持流式，回退到普通调用
          const response = await this.call(model, prompt);
          onChunk({
            ...response,
            isComplete: true,
            isStreaming: false,
            error: response.error || "当前使用的原生Gemini API端点不支持流式输出，已自动使用传统输出模式。如需流式输出，请使用OpenAI兼容端点（包含'/v1beta/openai/'路径）。"
          });
          return;
        } else {
          // GoogleGenAI SDK不支持流式，回退到普通调用
          const response = await this.call(model, prompt);
          onChunk({
            ...response,
            isComplete: true,
            isStreaming: false,
            error: response.error || "当前使用的GoogleGenAI SDK不支持流式输出，已自动使用传统输出模式。如需流式输出，请使用OpenAI兼容端点（包含'/v1beta/openai/'路径）。"
          });
          return;
        }
      } else {
        // Ollama 或 OpenAI 兼容提供商
        endpoint = model.endpoint || (model.provider === 'ollama' ? 'http://localhost:11434/v1' : '');
        endpoint = endpoint.replace(/\/+$/, '');
        if (!endpoint.endsWith('/chat/completions')) {
          endpoint = `${endpoint}/chat/completions`;
        }
        apiKey = model.apiKey || '';
        isOpenAICompatible = true;
      }

      // 只有OpenAI兼容端点支持流式
      if (!isOpenAICompatible) {
        const response = await this.call(model, prompt);
        onChunk({
          ...response,
          isComplete: true,
          isStreaming: false,
          error: response.error || "当前配置的端点不支持流式输出，已自动使用传统输出模式。如需流式输出，请使用OpenAI兼容端点。"
        });
        return;
      }

      // 发送流式请求
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({
          model: model.modelName,
          messages: buildMessages(model.systemPrompt),
          temperature: model.temperature ?? 0.7,
          max_tokens: model.maxTokens,
          stream: true
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        let msg = res.statusText;
        try {
          const errJson = JSON.parse(errText);
          msg = errJson.error?.message || errJson.message || msg;
        } catch(e) {}
        
        onChunk({
          content: "",
          error: `流式请求失败 (${res.status}): ${msg}`,
          isComplete: true
        });
        return;
      }

      // 读取流式响应
      const reader = res.body?.getReader();
      if (!reader) {
        onChunk({
          content: "",
          error: "无法读取响应流",
          isComplete: true
        });
        return;
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let finishReason = '';
      let modelName = model.modelName;
      let tokenInfo: { prompt: number; completion: number; total: number } | undefined;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                // 流式完成
                onChunk({
                  content: accumulatedContent,
                  model: modelName,
                  finishReason,
                  tokens: tokenInfo,
                  isComplete: true,
                  isStreaming: false
                });
                return;
              }

              try {
                const parsed = JSON.parse(data);
                
                // 更新模型名称（如果提供）
                if (parsed.model) {
                  modelName = parsed.model;
                }

                // 提取token信息（如果提供）
                if (parsed.usage) {
                  tokenInfo = {
                    prompt: parsed.usage.prompt_tokens || 0,
                    completion: parsed.usage.completion_tokens || 0,
                    total: parsed.usage.total_tokens || 0
                  };
                }

                // 提取内容
                const delta = parsed.choices?.[0]?.delta?.content || '';
                if (delta) {
                  accumulatedContent += delta;
                  
                  // 发送更新（包含当前的token信息）
                  onChunk({
                    content: accumulatedContent,
                    model: modelName,
                    tokens: tokenInfo,
                    isComplete: false,
                    isStreaming: true
                  });
                }

                // 更新完成原因
                if (parsed.choices?.[0]?.finish_reason) {
                  finishReason = parsed.choices[0].finish_reason;
                }
              } catch (e) {
                // 忽略解析错误，继续处理下一个数据块
                console.warn('解析流式数据块失败:', e);
              }
            }
          }
        }
      } catch (error: any) {
        onChunk({
          content: accumulatedContent,
          error: `流式读取错误: ${error.message}`,
          isComplete: true
        });
      } finally {
        // 确保关闭读取器
        reader.releaseLock();
      }
    } catch (error: any) {
      onChunk({
        content: "",
        error: `流式调用异常: ${error.message}`,
        isComplete: true
      });
    }
  }
}





