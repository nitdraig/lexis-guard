import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput, Spinner } from '@inkjs/ui';
import { AIRouter } from '../../ai/ai-router.js';
import { createAIRouter } from '../../ai/factory.js';
import type { SynthesisOutput } from '../../ai/ai-provider.js';
import type { RawLexisrc } from '../../config/lexisrc-schema.js';
import type { TuiSession } from '../session.js';

interface AiViewProps {
  session: TuiSession;
  onBack: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// lexis: cap the on-screen transcript so the input stays visible on small terminals
const MAX_CHAT = 10;

// lexis: real provider (cloud or local) via createAIRouter; deterministic stub offline
function buildRouter(ai: RawLexisrc['ai']): AIRouter {
  return createAIRouter(ai);
}

export function AiView({ session, onBack }: AiViewProps): React.ReactElement {
  const [synthesis, setSynthesis] = useState<SynthesisOutput | null>(null);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);

  const findings = session.findings ?? [];

  // lexis: single-key navigation (Esc) so the question input keeps focus
  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  useEffect(() => {
    if (findings.length === 0) return;
    setSynthesisError(null);
    buildRouter(session.rawConfig.ai)
      .synthesize(findings)
      .then(setSynthesis)
      .catch((err) => setSynthesisError(err instanceof Error ? err.message : String(err)));
  }, [findings, session.rawConfig.ai]);

  if (findings.length === 0) {
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Text bold color="cyan">
          AI Consultation
        </Text>
        <Text dimColor>Run an audit first to have findings to analyze.</Text>
        <Text dimColor>Press Esc to go back.</Text>
      </Box>
    );
  }

  const router = buildRouter(session.rawConfig.ai);

  async function submit(value: string): Promise<void> {
    const question = value.trim();
    if (!question || pending) return;
    setPending(true);
    setChat((prev) => [...prev, { role: 'user', content: question }]);
    try {
      const res = await router.consult(question, findings);
      setChat((prev) => [...prev, { role: 'assistant', content: res.answer }]);
    } catch (err) {
      setChat((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : String(err)}` }
      ]);
    } finally {
      setPending(false);
    }
  }

  const hidden = chat.length > MAX_CHAT ? chat.length - MAX_CHAT : 0;

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Text bold color="cyan">
        AI Consultation — {findings.length} findings
      </Text>

      {synthesis === null ? (
        synthesisError === null ? (
          <Spinner label="Generating synthesis..." />
        ) : (
          <Text color="red">Synthesis failed: {synthesisError}</Text>
        )
      ) : (
        <Box flexDirection="column">
          <Text dimColor>Posture: </Text>
          <Text
            bold
            color={
              synthesis.overall_posture === 'healthy'
                ? 'green'
                : synthesis.overall_posture === 'needs_attention'
                  ? 'yellow'
                  : 'red'
            }
          >
            {synthesis.overall_posture}
          </Text>
          <Text>{synthesis.summary}</Text>
          <Box marginTop={1} flexDirection="column">
            {synthesis.top_risks.map((r) => (
              <Text key={r.rule_id}>
                <Text color="magenta">{r.rule_id}</Text>
                <Text dimColor> ({r.priority}) — {r.rationale}</Text>
              </Text>
            ))}
          </Box>
        </Box>
      )}

      {chat.length > 0 && (
        <Box flexDirection="column" marginTop={1} gap={1}>
          <Text bold color="cyan">
            Conversation
          </Text>
          {hidden > 0 && <Text dimColor>... {hidden} earlier messages hidden</Text>}
          {chat.slice(-MAX_CHAT).map((m, i) => (
            <Box key={chat.length - MAX_CHAT + i} flexDirection="column">
              <Text bold color={m.role === 'user' ? 'cyan' : 'green'}>
                {m.role === 'user' ? 'You' : 'lexis-guard'}:
              </Text>
              <Text>{m.content}</Text>
            </Box>
          ))}
          {pending && <Text dimColor>lexis-guard: typing...</Text>}
        </Box>
      )}

      <Box marginTop={1}>
        <TextInput
          key={chat.length}
          placeholder="Ask lexis-guard about the findings (e.g. how do I fix the rate limit?)"
          onSubmit={submit}
        />
      </Box>
      <Text dimColor>Press Esc to go back.</Text>
    </Box>
  );
}