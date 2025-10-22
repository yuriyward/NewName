const ComponentsSection = () => (
  <div className="space-y-3">
    <h2 className="text-xl font-bold">Component Library</h2>
    <div className="heroui-card">
      <h3 className="text-sm font-semibold mb-2">Button Sizes</h3>
      <div className="space-y-2">
        <div>
          <p className="text-xs opacity-70 mb-2">Small (Popup)</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="heroui-button heroui-button-sm heroui-button-primary"
            >
              Apply
            </button>
            <button
              type="button"
              className="heroui-button heroui-button-sm heroui-button-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs opacity-70 mb-2">Medium (Default)</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="heroui-button heroui-button-md heroui-button-primary"
            >
              Apply Rename
            </button>
            <button
              type="button"
              className="heroui-button heroui-button-md heroui-button-secondary"
            >
              Keep Original
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs opacity-70 mb-2">Large (Settings)</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="heroui-button heroui-button-lg heroui-button-primary"
            >
              Apply Rename
            </button>
            <button
              type="button"
              className="heroui-button heroui-button-lg heroui-button-secondary"
            >
              Keep Original
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default ComponentsSection;
