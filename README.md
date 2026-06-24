# GLB Editor

A web-based 3D model editor for GLB (glTF Binary) files with advanced skeleton and animation editing capabilities.

## Features

### Model Management
- Drag-and-drop or file picker support for loading GLB files
- Interactive 3D viewport with orbit controls
- Automatic model centering and zoom controls
- Save modified models back to GLB format

### Animation Tools
- View and play all animations in the model
- Rename animations with validation (prevents duplicates and reserved names)
- Play/pause animation controls
- Animation name history saved in local storage for quick reuse

### Skeleton Editing
- Visual bone hierarchy display
- Individual bone rotation editing (X, Y, Z axes)
- Real-time rotation preview in both radians and degrees
- Copy and paste bone rotations between bones
- Reset individual bones to their original rotations
- Export/import entire skeleton configurations as JSON

### Bone Management
- Complete bone list with parent relationships
- Hierarchical bone tree view
- Copy individual or all bone names to clipboard
- Parent-child relationship visualization

## Getting Started

### Prerequisites
- Node.js (v14 or higher recommended)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Usage

1. Open the application in your browser
2. Load a GLB file by:
   - Clicking the "Load GLB File" area
   - Dragging and dropping a `.glb` file onto the drop zone
3. Use the left panel for bone management and model loading
4. Use the right panel for skeleton editing and animation controls

## Technology Stack

- **Three.js** - 3D rendering engine
- **glTF Transform** - GLB file processing
- **Vite** - Build tool and development server
- **Vanilla JavaScript** - No framework dependencies

## Project Structure

```
glbEdit/
├── index.html          # Main HTML file with UI layout
├── src/
│   └── main.js         # Application logic and Three.js setup
├── package.json        # Project dependencies and scripts
└── vite.config.js      # Vite configuration
```

## Key Controls

### Viewport
- **Left Mouse**: Rotate camera (orbit)
- **Right Mouse**: Pan camera
- **Mouse Wheel**: Zoom in/out
- **+ / - buttons**: Manual zoom controls

### Skeleton Editor
- Select a bone from the dropdown
- Adjust rotation using sliders or numeric inputs
- Use "Copy Single Bone" / "Paste Single Bone" for quick duplication
- "Reset Bone" restores original rotation

### Export/Import
- **Export Skeleton to JSON**: Saves complete skeleton configuration
- **Import Skeleton from JSON**: Loads previously saved skeleton data
- **Save Modified GLB**: Downloads the edited model

## Data Persistence

- Animation names are saved to browser local storage
- Previously used animation names appear in autocomplete suggestions

## Browser Compatibility

Works in all modern browsers with WebGL support:
- Chrome/Edge (recommended)
- Firefox
- Safari

## License

ISC

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.
