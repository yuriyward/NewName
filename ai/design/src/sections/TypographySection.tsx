import CodeSnippet from '../components/CodeSnippet';

const TypographySection = () => (
  <div className="space-y-3">
    <div>
      <h2 className="text-xl font-bold mb-2">Typography Scale</h2>
      <p className="text-sm opacity-80 mb-2">
        Clear hierarchy optimized for extension UI constraints.
      </p>
    </div>

    <div className="space-y-2">
      <div className="heroui-card">
        <h1 className="text-lg font-bold mb-1">Heading 1</h1>
        <p className="text-xs opacity-70">
          14px • font-bold • Main page titles
        </p>
      </div>
      <div className="heroui-card">
        <h2 className="text-base font-semibold mb-1">Heading 2</h2>
        <p className="text-xs opacity-70">
          12px • font-semibold • Section headers
        </p>
      </div>
      <div className="heroui-card">
        <h3 className="text-sm font-medium mb-1">Heading 3</h3>
        <p className="text-xs opacity-70">
          11px • font-medium • Subsection headers
        </p>
      </div>
      <div className="heroui-card">
        <p className="text-sm mb-1">Body Text</p>
        <p className="text-xs opacity-70">
          11px • Settings pages, modal content
        </p>
      </div>
      <div className="heroui-card">
        <p className="text-xs mb-1">Small Text</p>
        <p className="text-xs opacity-70">
          10px • Popup interface, secondary info
        </p>
      </div>
    </div>

    <div className="heroui-card">
      <h3 className="text-sm font-semibold mb-2">Implementation</h3>
      <CodeSnippet
        code={`/* Extra Compact Typography Classes */
.text-popup { font-size: 11px; font-weight: 400; }    /* Popup interface */
.text-settings { font-size: 12px; font-weight: 400; } /* Settings pages */
.text-caption { font-size: 10px; font-weight: 400; }  /* Helper text */`}
      />
    </div>
  </div>
);

export default TypographySection;
