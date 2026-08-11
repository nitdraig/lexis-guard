import { generateText, Output } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { LMSTUDIO_INFERENCE_URL, OLLAMA_INFERENCE_URL } from './local-models.js';
import { triageOutputSchema, synthesisOutputSchema } from './ai-provider.js';
/** Serialized digest of sanitized findings sent to the model. */
function findingsContext(findings) {
    return JSON.stringify(findings.map((f) => ({
        hash: f.hash,
        rule_id: f.rule_id,
        severity: f.severity,
        worst_case: f.worst_case,
        method: f.method,
        path: f.path,
        description: f.description,
        evidence: f.evidence,
        cwe: f.cwe,
        cvss: f.cvss,
        count: f.count
    })), null, 2);
}
/**
 * Real AI provider backed by the Vercel AI SDK: cloud (openai / deepseek / anthropic)
 * and local inference (ollama / lm studio). Uses the model configured in
 * `.lexisrc.json` ai.model; apiKey is only used by the cloud providers.
 */
export class CloudProvider {
    id;
    model;
    constructor(options) {
        const { provider, model, apiKey } = options;
        this.id = `cloud:${provider}:${model}`;
        this.model = this.buildModel(provider, apiKey, model);
    }
    buildModel(provider, apiKey, modelId) {
        // lexis: per-provider SDK factory; cloud ones accept { apiKey } explicitly,
        // local ones (ollama / lm studio) are OpenAI-compatible /v1 servers, so the
        // same createOpenAI factory points at the user's own machine (no real key)
        switch (provider) {
            case 'openai':
                return createOpenAI({ apiKey })(modelId);
            case 'deepseek':
                return createDeepSeek({ apiKey })(modelId);
            case 'anthropic':
                return createAnthropic({ apiKey })(modelId);
            case 'ollama':
                return createOpenAI({ baseURL: OLLAMA_INFERENCE_URL, apiKey: 'ollama' })(modelId);
            case 'lmstudio':
                return createOpenAI({ baseURL: LMSTUDIO_INFERENCE_URL, apiKey: 'lm-studio' })(modelId);
        }
    }
    async triage(findings) {
        const { output } = await generateText({
            model: this.model,
            output: Output.object({ schema: triageOutputSchema }),
            system: 'You are a senior API security auditor. For each finding decide if it is a true positive, ' +
                'a false positive, or needs review; state the business impact and a concrete remediation. ' +
                'Do not invent findings. Answer in the language of the question when applicable.',
            prompt: `Classify these audit findings (already deduplicated and sanitized):\n${findingsContext(findings)}`
        });
        return output;
    }
    async synthesize(findings) {
        const { output } = await generateText({
            model: this.model,
            output: Output.object({ schema: synthesisOutputSchema }),
            system: 'You are a lead security architect writing an executive audit summary. ' +
                'Be concise, specific and actionable, and do not invent findings.',
            prompt: `Audit findings:\n${findingsContext(findings)}`
        });
        return output;
    }
    async consult(question, findings) {
        const { text } = await generateText({
            model: this.model,
            system: 'You are lexis-guard, an expert API cybersecurity and API performance auditor. ' +
                'Only answer questions about API security (OWASP API Top 10, authentication, rate limiting, ' +
                'injection, BOLA/BFLA, CORS, TLS) and API performance (latency, throughput, payload, scalability). ' +
                'For any other topic, reply briefly that it is outside your scope. Use only the provided ' +
                'findings and standard audit expertise; never invent findings.',
            prompt: `Question: ${question}\n\nFindings:\n${findingsContext(findings)}`
        });
        return { answer: text.trim() || 'No answer provided.' };
    }
}
//# sourceMappingURL=cloud-provider.js.map