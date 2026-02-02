# 🎯 AI Model ID Reference Guide

This document lists the **exact model IDs** verified from official documentation. Always use these IDs to avoid API errors.

---

## 📋 Model Mapping Table (Verified 2026-01-30)

| Provider | Standard Model ID | Reasoning/Deep Thinking Model ID | Source |
|----------|-------------------|----------------------------------|--------|
| **OpenAI** | `gpt-5-mini` | `gpt-5.2` | Internal |
| **Google Gemini** | `gemini-3-flash-preview` | `gemini-3-pro-preview` | Internal |
| **Anthropic Claude** | `claude-sonnet-4-5-20250929` | `claude-sonnet-4-5-20250929` | [Official Docs](https://docs.anthropic.com/en/docs/about-claude/models) |
| **xAI Grok** | `grok-3-mini` | `grok-4` | [Official Docs](https://docs.x.ai/docs/models) |
| **Perplexity** | `sonar` | `sonar-reasoning-pro` | Internal |

---

## 🔍 Official Documentation Sources

### **Anthropic Claude**
Source: https://docs.anthropic.com/en/docs/about-claude/models

**Current Model (Claude 4.5 Sonnet):**
```
claude-sonnet-4-5-20250929
```

**API Details:**
- Endpoint: `https://api.anthropic.com/v1/messages`
- Headers:
  - `x-api-key: ${ANTHROPIC_API_KEY}`
  - `anthropic-version: 2023-06-01`
  - `content-type: application/json`

**⚠️ DEPRECATED Models (will cause `not_found_error`):**
- `claude-3-5-sonnet-latest` ❌
- `claude-3-5-sonnet-20241022` ❌
- `claude-3-opus-latest` ❌
- `claude-3-opus-20240229` ❌

---

### **xAI Grok**
Source: https://docs.x.ai/docs/models

**Available Models:**
| Model | Type | Description |
|-------|------|-------------|
| `grok-4` | Reasoning | Full reasoning model - NO non-reasoning mode |
| `grok-3-mini` | Fast | Smaller, faster model for quick responses |
| `grok-4-1-fast` | Agentic Search | Optimized for search tools (x_search, web_search) |

**Search Tools:**
```typescript
tools: [
  { type: "function", function: { name: "web_search" } },
  { type: "function", function: { name: "x_search" } }
]
```

**⚠️ Important Notes from xAI Docs:**
- Grok 4 is ONLY a reasoning model - there is no non-reasoning mode
- `presencePenalty`, `frequencyPenalty`, and `stop` parameters are NOT supported by reasoning models
- For search, consider using `grok-4-1-fast` which is optimized for agentic search

---

## 🛠️ Current Implementation

### **Chat Edge Function Model Selection**
```typescript
const useModel = deepThinking
  // Using correct model IDs from official documentation
  // Claude: claude-sonnet-4-5-20250929 (https://docs.anthropic.com/en/docs/about-claude/models)
  // Grok: grok-4 for reasoning, grok-3-mini for fast (https://docs.x.ai/docs/models)
  ? (useProvider === 'openai' ? 'gpt-5.2' :
    useProvider === 'perplexity' ? 'sonar-reasoning-pro' :
      useProvider === 'grok' ? 'grok-4' :
        useProvider === 'claude' ? 'claude-sonnet-4-5-20250929' :
          'gemini-3-pro-preview')
  : (useProvider === 'openai' ? 'gpt-5-mini' :
    useProvider === 'perplexity' ? 'sonar' :
      useProvider === 'grok' ? 'grok-3-mini' :
        useProvider === 'claude' ? 'claude-sonnet-4-5-20250929' :
          'gemini-3-flash-preview');
```

---

## 🚨 Common Errors & Solutions

### **Claude: `not_found_error`**
```json
{"type":"error","error":{"type":"not_found_error","message":"model: claude-3-5-sonnet-20241022"}}
```
**Cause:** Claude 3.5 models have been deprecated. Use Claude 4.5 instead.
**Solution:** Use `claude-sonnet-4-5-20250929`

---

### **Grok: Empty Message**
When Grok returns "(Empty message)" after using search tools.
**Cause:** The streaming transform isn't properly handling all response chunks.
**Solution:** Ensure the transform stream handles tool call responses and waits for the actual content.

---

## 📝 Testing Checklist

When adding or updating a model:

- [ ] Check official API documentation for exact model IDs
- [ ] Test with a simple "Hello" message
- [ ] Verify the model ID matches exactly (case-sensitive)
- [ ] Update both `chat` and `chat-dev` Edge Functions
- [ ] Update this reference guide
- [ ] Deploy both functions
- [ ] Test in development mode

---

## 🔄 Update History

| Date | Provider | Old Model | New Model | Reason |
|------|----------|-----------|-----------|--------|
| 2026-01-30 | Claude | `claude-3-5-sonnet-20241022` | `claude-sonnet-4-5-20250929` | Claude 3.5 deprecated, moved to Claude 4.5 |
| 2026-01-30 | Grok | `grok-4.1-fast-reasoning` | `grok-4` | Using official model names from xAI docs |
| 2026-01-30 | Grok | `grok-4-fast-non-reasoning` | `grok-3-mini` | Using official model names from xAI docs |

---

## 📚 External Resources

- [Anthropic Claude Models](https://docs.anthropic.com/en/docs/about-claude/models)
- [xAI Grok Models & Pricing](https://docs.x.ai/docs/models)
- [xAI Search Tools](https://docs.x.ai/docs/guides/live-search)
- [Perplexity Model Cards](https://docs.perplexity.ai/docs/model-cards)
