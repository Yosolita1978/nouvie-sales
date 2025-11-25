export default function TestStylesPage() {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold mb-6">Nouvie Style Guide</h2>
          <p className="text-gray-600 mb-4">
            Testing all brand colors, buttons, cards, and components
          </p>
        </div>
  
        {/* Colors Section */}
        <section className="card-padded">
          <h3 className="text-xl font-semibold mb-4">Brand Colors</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="h-20 bg-nouvie-blue rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Nouvie Blue</p>
              <p className="text-xs text-gray-500">#0440a5</p>
            </div>
            <div>
              <div className="h-20 bg-nouvie-turquoise rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Turquoise</p>
              <p className="text-xs text-gray-500">#33ccd4</p>
            </div>
            <div>
              <div className="h-20 bg-nouvie-light-blue rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Light Blue</p>
              <p className="text-xs text-gray-500">#547cc1</p>
            </div>
            <div>
              <div className="h-20 bg-nouvie-pale-blue rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Pale Blue</p>
              <p className="text-xs text-gray-500">#acbfe1</p>
            </div>
            <div>
              <div className="h-20 bg-nouvie-navy rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Navy</p>
              <p className="text-xs text-gray-500">#052d86</p>
            </div>
          </div>
        </section>
  
        {/* Buttons Section */}
        <section className="card-padded">
          <h3 className="text-xl font-semibold mb-4">Buttons</h3>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary">Primary Button</button>
              <button className="btn-secondary">Secondary Button</button>
              <button className="btn-outline">Outline Button</button>
              <button className="btn-ghost">Ghost Button</button>
              <button className="btn-danger">Danger Button</button>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary btn-sm">Small</button>
              <button className="btn-primary">Regular</button>
              <button className="btn-primary btn-lg">Large</button>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled>Disabled Primary</button>
              <button className="btn-secondary" disabled>Disabled Secondary</button>
            </div>
          </div>
        </section>
  
        {/* Cards Section */}
        <section className="space-y-4">
          <h3 className="text-xl font-semibold">Cards</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-padded">
              <h4 className="font-semibold mb-2">Standard Card</h4>
              <p className="text-sm text-gray-600">
                Basic card with padding and shadow
              </p>
            </div>
            
            <div className="card-clickable p-6">
              <h4 className="font-semibold mb-2">Clickable Card</h4>
              <p className="text-sm text-gray-600">
                Hover me! I have interactive effects
              </p>
            </div>
            
            <div className="card">
              <div className="card-header">Card Header</div>
              <div className="card-body">
                <p className="text-sm text-gray-600">Card body content</p>
              </div>
              <div className="card-footer">
                <button className="btn-primary btn-sm">Action</button>
              </div>
            </div>
          </div>
        </section>
  
        {/* Forms Section */}
        <section className="card-padded">
          <h3 className="text-xl font-semibold mb-4">Form Elements</h3>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="label">Text Input</label>
              <input type="text" className="input" placeholder="Enter text..." />
            </div>
            
            <div>
              <label className="label">Select Dropdown</label>
              <select className="select">
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </select>
            </div>
            
            <div>
              <label className="label">Input with Error</label>
              <input type="text" className="input-error" placeholder="Error state..." />
              <p className="error-message">This field is required</p>
            </div>
          </div>
        </section>
  
        {/* Badges Section */}
        <section className="card-padded">
          <h3 className="text-xl font-semibold mb-4">Badges</h3>
          <div className="flex flex-wrap gap-3">
            <span className="badge-success">Success</span>
            <span className="badge-warning">Warning</span>
            <span className="badge-danger">Danger</span>
            <span className="badge-info">Info</span>
            <span className="badge-primary">Primary</span>
          </div>
        </section>
  
        {/* Gradients Section */}
        <section className="space-y-4">
          <h3 className="text-xl font-semibold">Gradients</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-nouvie p-8 rounded-lg text-white">
              <h4 className="font-semibold mb-2">Gradient Background</h4>
              <p className="text-sm">Blue to Turquoise gradient</p>
            </div>
            <div className="card-padded">
              <h4 className="text-gradient-nouvie text-2xl font-bold mb-2">
                Gradient Text
              </h4>
              <p className="text-sm text-gray-600">
                Text with gradient effect
              </p>
            </div>
          </div>
        </section>
      </div>
    )
  }