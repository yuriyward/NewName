import { CheckIcon, ClipboardIcon } from '@heroicons/react/16/solid';
import { useState } from 'react';

interface CodeSnippetProps {
  code: string;
}

const CodeSnippet = ({ code }: CodeSnippetProps) => {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="absolute top-2 right-2 heroui-button heroui-button-secondary text-xs flex items-center gap-1"
        onClick={copyCode}
      >
        {copied ? (
          <>
            <CheckIcon className="w-3.5 h-3.5" />
            Copied
          </>
        ) : (
          <>
            <ClipboardIcon className="w-3.5 h-3.5" />
            Copy
          </>
        )}
      </button>
      <pre className="code-block">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default CodeSnippet;
