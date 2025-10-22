const SettingsSection = () => (
  <div className="space-y-3">
    <h2 className="text-xl font-bold">Settings Patterns</h2>
    <div className="heroui-card">
      <h3 className="text-sm font-semibold mb-2">
        Coming Soon — Preference Controls
      </h3>
      <p className="text-xs opacity-70 mb-2">
        Detailed mock-ups for settings toggles, confirmation routing, and cloud
        consent flows will live here. This section keeps placeholders visible so
        navigation and layout stay accurate while designs evolve.
      </p>
      <ul className="list-disc list-inside text-xs opacity-70 space-y-1">
        <li>Mode presets (Balanced, Silent, Careful, Custom)</li>
        <li>Per-file-type rename policies</li>
        <li>Cloud assist and AI model readiness indicators</li>
      </ul>
    </div>
  </div>
);

export default SettingsSection;
