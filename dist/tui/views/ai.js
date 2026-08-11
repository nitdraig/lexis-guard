import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput, Spinner } from '@inkjs/ui';
import { createAIRouter } from '../../ai/factory.js';
// lexis: cap the on-screen transcript so the input stays visible on small terminals
const MAX_CHAT = 10;
// lexis: real provider (cloud or local) via createAIRouter; deterministic stub offline
function buildRouter(ai) {
    return createAIRouter(ai);
}
export function AiView({ session, onBack }) {
    const [synthesis, setSynthesis] = useState(null);
    const [synthesisError, setSynthesisError] = useState(null);
    const [chat, setChat] = useState([]);
    const [pending, setPending] = useState(false);
    const findings = session.findings ?? [];
    // lexis: single-key navigation (Esc) so the question input keeps focus
    useInput((_input, key) => {
        if (key.escape)
            onBack();
    });
    useEffect(() => {
        if (findings.length === 0)
            return;
        setSynthesisError(null);
        buildRouter(session.rawConfig.ai)
            .synthesize(findings)
            .then(setSynthesis)
            .catch((err) => setSynthesisError(err instanceof Error ? err.message : String(err)));
    }, [findings, session.rawConfig.ai]);
    if (findings.length === 0) {
        return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "AI Consultation" }), _jsx(Text, { dimColor: true, children: "Run an audit first to have findings to analyze." }), _jsx(Text, { dimColor: true, children: "Press Esc to go back." })] }));
    }
    const router = buildRouter(session.rawConfig.ai);
    async function submit(value) {
        const question = value.trim();
        if (!question || pending)
            return;
        setPending(true);
        setChat((prev) => [...prev, { role: 'user', content: question }]);
        try {
            const res = await router.consult(question, findings);
            setChat((prev) => [...prev, { role: 'assistant', content: res.answer }]);
        }
        catch (err) {
            setChat((prev) => [
                ...prev,
                { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : String(err)}` }
            ]);
        }
        finally {
            setPending(false);
        }
    }
    const hidden = chat.length > MAX_CHAT ? chat.length - MAX_CHAT : 0;
    return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsxs(Text, { bold: true, color: "cyan", children: ["AI Consultation \u2014 ", findings.length, " findings"] }), synthesis === null ? (synthesisError === null ? (_jsx(Spinner, { label: "Generating synthesis..." })) : (_jsxs(Text, { color: "red", children: ["Synthesis failed: ", synthesisError] }))) : (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { dimColor: true, children: "Posture: " }), _jsx(Text, { bold: true, color: synthesis.overall_posture === 'healthy'
                            ? 'green'
                            : synthesis.overall_posture === 'needs_attention'
                                ? 'yellow'
                                : 'red', children: synthesis.overall_posture }), _jsx(Text, { children: synthesis.summary }), _jsx(Box, { marginTop: 1, flexDirection: "column", children: synthesis.top_risks.map((r) => (_jsxs(Text, { children: [_jsx(Text, { color: "magenta", children: r.rule_id }), _jsxs(Text, { dimColor: true, children: [" (", r.priority, ") \u2014 ", r.rationale] })] }, r.rule_id))) })] })), chat.length > 0 && (_jsxs(Box, { flexDirection: "column", marginTop: 1, gap: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "Conversation" }), hidden > 0 && _jsxs(Text, { dimColor: true, children: ["... ", hidden, " earlier messages hidden"] }), chat.slice(-MAX_CHAT).map((m, i) => (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { bold: true, color: m.role === 'user' ? 'cyan' : 'green', children: [m.role === 'user' ? 'You' : 'lexis-guard', ":"] }), _jsx(Text, { children: m.content })] }, chat.length - MAX_CHAT + i))), pending && _jsx(Text, { dimColor: true, children: "lexis-guard: typing..." })] })), _jsx(Box, { marginTop: 1, children: _jsx(TextInput, { placeholder: "Ask lexis-guard about the findings (e.g. how do I fix the rate limit?)", onSubmit: submit }, chat.length) }), _jsx(Text, { dimColor: true, children: "Press Esc to go back." })] }));
}
//# sourceMappingURL=ai.js.map