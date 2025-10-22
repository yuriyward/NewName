import CodeSnippet from '../components/CodeSnippet';

const colors = [
  {
    name: 'Primary',
    value: 'var(--heroui-primary)',
    usage: 'Primary actions, active states',
    hex: '#18181B',
  },
  {
    name: 'Secondary',
    value: 'var(--heroui-secondary)',
    usage: 'Secondary text, subtle actions',
    hex: '#71717A',
  },
  {
    name: 'Success',
    value: 'var(--heroui-success)',
    usage: 'Success states, confirmations',
    hex: '#22C55E',
  },
  {
    name: 'Warning',
    value: 'var(--heroui-warning)',
    usage: 'Warnings, cautions',
    hex: '#EAB308',
  },
  {
    name: 'Danger',
    value: 'var(--heroui-danger)',
    usage: 'Errors, destructive actions',
    hex: '#EF4444',
  },
  {
    name: 'Background',
    value: 'var(--heroui-background)',
    usage: 'Page background',
    hex: '#FFFFFF',
  },
  {
    name: 'Content 1',
    value: 'var(--heroui-content1)',
    usage: 'Card surfaces',
    hex: '#FFFFFF',
  },
  {
    name: 'Content 2',
    value: 'var(--heroui-content2)',
    usage: 'Subtle surfaces',
    hex: '#F8F8F8',
  },
];

const ColorsSection = () => (
  <div className="space-y-3">
    <div>
      <h2 className="text-xl font-bold mb-2">Minimal Color System</h2>
      <p className="text-sm opacity-80 mb-2">
        Professional monochromatic palette with subtle accents for a clean,
        modern aesthetic.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-2.5">
      {colors.map((color) => (
        <div key={color.name} className="heroui-card">
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className="w-8 h-8 rounded border border-[var(--heroui-content3)]"
              style={{ backgroundColor: color.value }}
            />
            <div>
              <h3 className="text-sm font-semibold">{color.name}</h3>
              <code className="text-xs opacity-70">{color.hex}</code>
            </div>
          </div>
          <p className="text-xs opacity-80">{color.usage}</p>
        </div>
      ))}
    </div>

    <div className="heroui-card">
      <h3 className="text-sm font-semibold mb-2">Usage Examples</h3>
      <CodeSnippet
        code={`/* Minimal Professional Color System */
background-color: var(--heroui-primary);       /* #18181B - Near black */
color: var(--heroui-primary-foreground);       /* #FFFFFF */

/* Neutral surfaces */
background-color: var(--heroui-content1);      /* #FFFFFF - Cards */
background-color: var(--heroui-content2);      /* #F8F8F8 - Subtle */
border-color: var(--heroui-content3);          /* #E5E5E5 - Borders */`}
      />
    </div>
  </div>
);

export default ColorsSection;
