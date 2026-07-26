'use client';

import { useEffect, useRef } from 'react';

const MONACO_BASE = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs';

let monacoLoadPromise;

function loadMonaco() {
  if (monacoLoadPromise) return monacoLoadPromise;
  monacoLoadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('no window'));
      return;
    }
    if (window.monaco) {
      resolve(window.monaco);
      return;
    }
    window.MonacoEnvironment = {
      getWorkerUrl(_moduleId, label) {
        const b = MONACO_BASE;
        if (label === 'json') return `${b}/language/json/json.worker.js`;
        if (label === 'css' || label === 'scss' || label === 'less') return `${b}/language/css/css.worker.js`;
        if (label === 'html' || label === 'handlebars' || label === 'razor') return `${b}/language/html/html.worker.js`;
        if (label === 'typescript' || label === 'javascript') return `${b}/language/typescript/ts.worker.js`;
        return `${b}/editor/editor.worker.js`;
      },
    };
    const boot = () => {
      try {
        window.require.config({ paths: { vs: MONACO_BASE } });
        window.require(['vs/editor/editor.main'], () => resolve(window.monaco));
      } catch (e) {
        reject(e);
      }
    };
    if (typeof window.require !== 'undefined') {
      boot();
      return;
    }
    const s = document.createElement('script');
    s.src = `${MONACO_BASE}/loader.js`;
    s.async = true;
    s.dataset.monacoLoader = '1';
    s.onload = boot;
    s.onerror = () => reject(new Error('Monaco loader failed'));
    document.body.appendChild(s);
  });
  return monacoLoadPromise;
}

export const LANG_OPTIONS = [
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'c', label: 'C' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'csharp', label: 'C#' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'kotlin', label: 'Kotlin' },
  { id: 'swift', label: 'Swift' },
];

export default function CodeWorkspace({
  value,
  onChange,
  language,
  onLanguageChange,
  templates,
  readOnly = false,
  hideOutput = false,
  leetcodeFill = false,
  onPasteBlocked,
  editorTheme = 'vs-dark',
}) {
  const hostRef = useRef(null);
  const editorRef = useRef(null);
  const subRef = useRef(null);
  const pasteHandlerRef = useRef(null);
  const onPasteBlockedRef = useRef(onPasteBlocked);

  useEffect(() => {
    onPasteBlockedRef.current = onPasteBlocked;
  }, [onPasteBlocked]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const monaco = await loadMonaco();
        if (cancelled || !hostRef.current) return;
        const ed = monaco.editor.create(hostRef.current, {
          value: value || '',
          language: language || 'python',
          theme: editorTheme,
          fontSize: 13,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          readOnly: !!readOnly,
        });
        editorRef.current = ed;
        subRef.current = ed.onDidChangeModelContent(() => {
          onChange(ed.getValue());
        });
        const dom = typeof ed.getDomNode === 'function' ? ed.getDomNode() : null;
        if (dom && onPasteBlockedRef.current) {
          const ph = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            onPasteBlockedRef.current?.();
          };
          pasteHandlerRef.current = ph;
          dom.addEventListener('paste', ph, true);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
      const ed = editorRef.current;
      const dom = ed && typeof ed.getDomNode === 'function' ? ed.getDomNode() : null;
      if (dom && pasteHandlerRef.current) {
        dom.removeEventListener('paste', pasteHandlerRef.current, true);
        pasteHandlerRef.current = null;
      }
      if (subRef.current) {
        subRef.current.dispose();
        subRef.current = null;
      }
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.updateOptions({ readOnly: !!readOnly });
  }, [readOnly]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || typeof window === 'undefined' || !window.monaco) return;
    const monaco = window.monaco;
    const model = ed.getModel();
    if (!model) return;
    monaco.editor.setModelLanguage(model, language || 'python');
  }, [language]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const cur = ed.getValue();
    if (value !== undefined && value !== cur) {
      ed.setValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (!editorRef.current || typeof window === 'undefined' || !window.monaco) return;
    window.monaco.editor.setTheme(editorTheme);
  }, [editorTheme]);

  const rootClass = [
    'code-workspace',
    hideOutput ? 'code-workspace--no-output' : '',
    leetcodeFill ? 'code-workspace--leetcode' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass} style={{ flex: 1, display: 'flex' }}>
      <div className="code-workspace__editor" ref={hostRef} style={{ flex: 1, height: '100%' }} />
    </div>
  );
}
