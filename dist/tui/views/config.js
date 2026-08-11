import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Select, TextInput, StatusMessage, Spinner } from '@inkjs/ui';
import { writeFileSync } from 'node:fs';
import { loadRawConfig } from '../../config/loader.js';
import { encryptSecret, isEncrypted } from '../../config/secret.js';
import { modelsForProvider, defaultModel, isLocalProvider } from '../../ai/models.js';
import { listLocalModels } from '../../ai/local-models.js';
export function isValidTarget(input) {
    let hostname = input;
    if (!/^https?:\/\//i.test(input))
        hostname = `https://${input}`;
    try {
        const url = new URL(hostname);
        // lexis: reject URLs with userinfo (user:pass@host) to prevent hostname confusion attacks
        if (url.username || url.password)
            return false;
        return url.hostname.includes('.') && url.protocol === 'https:';
    }
    catch {
        return false;
    }
}
export function targetHostname(input) {
    return new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`).hostname.toLowerCase();
}
export function ConfigView({ session, onUpdateRaw, onUpdatePath, onBack }) {
    const [action, setAction] = useState('menu');
    const [message, setMessage] = useState(null);
    useInput((_input, key) => {
        if (key.escape && action !== 'menu')
            setAction('menu');
    });
    const raw = session.rawConfig;
    const targets = raw.scope.allowed_targets;
    function apply(update) {
        onUpdateRaw({ ...raw, ...update });
    }
    switch (action) {
        case 'add_target': {
            return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "Add target (domain, e.g. api.mycompany.com)" }), _jsx(TextInput, { placeholder: "https://api.miempresa.com", onSubmit: (value) => {
                            if (!value.trim() || !isValidTarget(value.trim())) {
                                setMessage({ ok: false, text: 'Invalid target. Use a domain or a valid https URL.' });
                                setAction('menu');
                                return;
                            }
                            const hostname = targetHostname(value);
                            if (targets.includes(hostname)) {
                                setMessage({ ok: false, text: `'${hostname}' is already in the list.` });
                            }
                            else {
                                apply({ scope: { ...raw.scope, allowed_targets: [...targets, hostname] } });
                                setMessage({ ok: true, text: `Target '${hostname}' added.` });
                            }
                            setAction('menu');
                        } }), _jsx(Text, { dimColor: true, children: "Esc to cancel" })] }));
        }
        case 'remove_target': {
            if (targets.length === 0) {
                setAction('menu');
                return _jsx(Box, {});
            }
            return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "Remove target" }), _jsx(Select, { options: [
                            ...targets.map((t) => ({ label: t, value: t })),
                            { label: '← Cancel', value: '__cancel__' }
                        ], onChange: (value) => {
                            if (value === '__cancel__') {
                                setAction('menu');
                                return;
                            }
                            apply({ scope: { ...raw.scope, allowed_targets: targets.filter((t) => t !== value) } });
                            setMessage({ ok: true, text: `Target '${value}' removed.` });
                            setAction('menu');
                        } })] }));
        }
        case 'mode': {
            return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "Mode" }), _jsx(Select, { options: [
                            { label: 'safe', value: 'safe' },
                            { label: 'aggressive', value: 'aggressive' },
                            { label: '← Cancel', value: '__cancel__' }
                        ], onChange: (value) => {
                            if (value === '__cancel__') {
                                setAction('menu');
                                return;
                            }
                            apply({ mode: value });
                            setAction('menu');
                        } })] }));
        }
        case 'provider': {
            return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "AI provider" }), _jsx(Select, { options: [
                            { label: 'openai', value: 'openai' },
                            { label: 'deepseek', value: 'deepseek' },
                            { label: 'anthropic', value: 'anthropic' },
                            { label: 'Ollama (local models)', value: 'ollama' },
                            { label: 'LM Studio (local models)', value: 'lmstudio' },
                            { label: 'More providers coming soon', value: '__soon__' },
                            { label: '← Cancel', value: '__cancel__' }
                        ], onChange: (value) => {
                            if (value === '__cancel__') {
                                setAction('menu');
                                return;
                            }
                            if (value === '__soon__') {
                                setMessage({ ok: false, text: 'More providers coming soon.' });
                                setAction('menu');
                                return;
                            }
                            const provider = value;
                            apply({ ai: { ...raw.ai, provider, model: defaultModel(provider) } });
                            // lexis: local providers have no fixed catalog; force model selection
                            if (isLocalProvider(provider))
                                setAction('model');
                            else
                                setAction('menu');
                        } })] }));
        }
        case 'model': {
            if (isLocalProvider(raw.ai.provider)) {
                return (_jsx(LocalModelPicker, { provider: raw.ai.provider, current: raw.ai.model ?? '', onPick: (model) => {
                        apply({ ai: { ...raw.ai, model } });
                        setAction('menu');
                    }, onCancel: () => setAction('menu') }));
            }
            const models = modelsForProvider(raw.ai.provider);
            if (models.length === 0) {
                setAction('menu');
                return _jsx(Box, {});
            }
            const current = raw.ai.model ?? defaultModel(raw.ai.provider);
            return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsxs(Text, { bold: true, color: "cyan", children: ["Model \u2014 provider: ", raw.ai.provider, " (current: ", current, ")"] }), _jsx(Select, { options: [
                            ...models.map((m) => ({ label: `${m.tier} · ${m.id}`, value: m.id })),
                            { label: '← Cancel', value: '__cancel__' }
                        ], onChange: (value) => {
                            if (value === '__cancel__') {
                                setAction('menu');
                                return;
                            }
                            apply({ ai: { ...raw.ai, model: value } });
                            setAction('menu');
                        } })] }));
        }
        case 'api_key': {
            return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsxs(Text, { bold: true, color: "cyan", children: ["API key \u2014 provider: ", raw.ai.provider] }), _jsx(Text, { dimColor: true, children: "Stored encrypted (AES-256-GCM). Key material lives in ~/.lexisguard/.secret" }), _jsx(TextInput, { placeholder: "sk-...", onSubmit: (value) => {
                            const key = value.trim();
                            if (!key) {
                                setMessage({ ok: false, text: 'Empty API key.' });
                                setAction('menu');
                                return;
                            }
                            apply({ ai: { ...raw.ai, api_key: encryptSecret(key) } });
                            setMessage({ ok: true, text: 'API key encrypted and stored.' });
                            setAction('menu');
                        } }), _jsx(Text, { dimColor: true, children: "Esc to cancel" })] }));
        }
        case 'save': {
            return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "Save configuration" }), _jsxs(Text, { dimColor: true, children: ["Path (default: ", session.configPath ?? '.lexisrc.json', ")"] }), _jsx(TextInput, { defaultValue: session.configPath ?? '.lexisrc.json', onSubmit: (value) => {
                            // lexis: TUI edits are raw; validate with the raw schema before saving
                            const validation = validateRawForSave(raw);
                            if (!validation.ok) {
                                setMessage({ ok: false, text: validation.error ?? 'Invalid configuration.' });
                                setAction('menu');
                                return;
                            }
                            const path = value.trim() || '.lexisrc.json';
                            writeFileSync(path, JSON.stringify(raw, null, 2), 'utf-8');
                            onUpdatePath(path);
                            setMessage({ ok: true, text: `Configuration saved to ${path}` });
                            setAction('menu');
                        } }), _jsx(Text, { dimColor: true, children: "Esc to cancel" })] }));
        }
        case 'import': {
            return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "Import configuration (path)" }), _jsx(TextInput, { placeholder: ".lexisrc.json", onSubmit: (value) => {
                            try {
                                const imported = loadRawConfig(value.trim());
                                onUpdateRaw(imported);
                                onUpdatePath(value.trim());
                                setMessage({ ok: true, text: `Configuration imported from ${value.trim()}` });
                            }
                            catch (err) {
                                setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) });
                            }
                            setAction('menu');
                        } }), _jsx(Text, { dimColor: true, children: "Esc to cancel" })] }));
        }
        case 'export': {
            return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "Export configuration (path)" }), _jsx(TextInput, { placeholder: "./config-backup.json", onSubmit: (value) => {
                            const path = value.trim();
                            if (!path) {
                                setMessage({ ok: false, text: 'Empty path.' });
                                setAction('menu');
                                return;
                            }
                            writeFileSync(path, JSON.stringify(raw, null, 2), 'utf-8');
                            setMessage({ ok: true, text: `Configuration exported to ${path}` });
                            setAction('menu');
                        } }), _jsx(Text, { dimColor: true, children: "Esc to cancel" })] }));
        }
        default: {
            return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "Configuration" }), _jsxs(Text, { dimColor: true, children: ["Targets (", targets.length, "): ", targets.join(', ') || '—'] }), _jsxs(Text, { dimColor: true, children: ["Mode: ", raw.mode, " \u00B7 AI: ", raw.ai.provider, " / ", raw.ai.model ?? defaultModel(raw.ai.provider), " \u00B7 API key:", ' ', isLocalProvider(raw.ai.provider)
                                ? 'local (no key)'
                                : isEncrypted(raw.ai.api_key ?? '')
                                    ? 'set (encrypted)'
                                    : 'not set', ' ', "\u00B7 Saved at: ", session.configPath ?? 'no file'] }), _jsx(Box, { marginTop: 1, children: _jsx(Select, { options: [
                                { label: 'Add target', value: 'add_target' },
                                { label: 'Remove target', value: 'remove_target' },
                                { label: 'Change mode', value: 'mode' },
                                { label: 'Change AI provider', value: 'provider' },
                                { label: 'Change AI model', value: 'model' },
                                { label: 'Set API key', value: 'api_key' },
                                { label: 'Save configuration', value: 'save' },
                                { label: 'Import from file', value: 'import' },
                                { label: 'Export to file', value: 'export' },
                                { label: '← Back', value: '__back__' }
                            ], onChange: (value) => {
                                if (value === '__back__')
                                    onBack();
                                else
                                    setAction(value);
                            } }) }), message && (_jsx(Box, { marginTop: 1, children: message.ok ? (_jsx(StatusMessage, { variant: "success", children: message.text })) : (_jsx(StatusMessage, { variant: "error", children: message.text })) }))] }));
        }
    }
}
// Validate that a raw config can be saved (mirrors rawLexisrcSchema constraints).
function validateRawForSave(raw) {
    if (raw.scope.allowed_targets.length === 0) {
        return { ok: false, error: 'Add at least one target before saving.' };
    }
    const profileCount = Object.keys(raw.auth.profiles).length;
    if (profileCount < 3) {
        return { ok: false, error: 'At least 3 authentication profiles are required.' };
    }
    // lexis: a local provider without a chosen model would resolve to '' and break audits
    if (isLocalProvider(raw.ai.provider) && !raw.ai.model) {
        return { ok: false, error: `Select a model for ${raw.ai.provider} before saving.` };
    }
    return { ok: true };
}
/** Lists the models installed in the user's local server; falls back to manual id. */
function LocalModelPicker({ provider, current, onPick, onCancel }) {
    const [models, setModels] = useState(null);
    const [manual, setManual] = useState(false);
    useEffect(() => {
        let cancelled = false;
        void listLocalModels(provider).then((list) => {
            if (!cancelled)
                setModels(list);
        });
        return () => {
            cancelled = true;
        };
    }, [provider]);
    if (manual) {
        return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsxs(Text, { bold: true, color: "cyan", children: ["Model id \u2014 provider: ", provider] }), _jsx(TextInput, { placeholder: provider === 'ollama' ? 'llama3.2' : 'qwen2.5-coder', onSubmit: (value) => {
                        if (value.trim())
                            onPick(value.trim());
                    } }), _jsx(Text, { dimColor: true, children: "Enter your model id, or Esc to cancel." })] }));
    }
    if (models === null) {
        return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsxs(Text, { bold: true, color: "cyan", children: ["Model \u2014 provider: ", provider] }), _jsx(Spinner, { label: `Querying ${provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'} ...` }), _jsx(Text, { dimColor: true, children: "Esc to cancel" })] }));
    }
    if (models.length === 0) {
        return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsxs(Text, { bold: true, color: "cyan", children: ["Model \u2014 provider: ", provider] }), _jsxs(StatusMessage, { variant: "error", children: ["Could not reach ", provider, " at ", provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234', ". Is it running?"] }), _jsx(TextInput, { placeholder: provider === 'ollama' ? 'llama3.2' : 'qwen2.5-coder', onSubmit: (value) => {
                        if (value.trim())
                            onPick(value.trim());
                    } }), _jsx(Text, { dimColor: true, children: "Enter your model id, or Esc to cancel." })] }));
    }
    return (_jsxs(Box, { flexDirection: "column", padding: 1, gap: 1, children: [_jsxs(Text, { bold: true, color: "cyan", children: ["Model \u2014 provider: ", provider, " (current: ", current || 'none', ")"] }), _jsx(Select, { visibleOptionCount: 8, options: [
                    ...models.map((m) => ({ label: m, value: m })),
                    { label: 'Enter model name manually...', value: '__manual__' },
                    { label: '← Cancel', value: '__cancel__' }
                ], onChange: (value) => {
                    if (value === '__cancel__')
                        onCancel();
                    else if (value === '__manual__')
                        setManual(true);
                    else
                        onPick(value);
                } }), _jsx(Text, { dimColor: true, children: "Esc to cancel" })] }));
}
//# sourceMappingURL=config.js.map