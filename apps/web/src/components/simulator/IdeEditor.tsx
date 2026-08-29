import React from 'react';
import Editor from '@monaco-editor/react';

interface IdeEditorProps {
  language: 'python' | 'typescript';
  code: string;
  setCode: (code: string) => void;
}

export function IdeEditor({ language, code, setCode }: IdeEditorProps) {
  return (
    <div className="flex-1 min-h-0 bg-[#0d1117] relative">
      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        value={code}
        onChange={(val) => setCode(val || '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineHeight: 1.6,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          formatOnPaste: true,
          guides: { bracketPairs: true, indentation: true },
        }}
      />
    </div>
  );
}
